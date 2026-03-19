"""
Image Processing Utilities for Object Size Measurement
Converts pixels to real-world measurements using A4 paper as reference
"""

import cv2
import numpy as np
from typing import Tuple, List, Optional
from dataclasses import dataclass


@dataclass
class MeasuredObject:
    """Represents a measured object with its dimensions"""

    width_cm: float
    height_cm: float
    contour_points: List[List[int]]
    bounding_box: Tuple[int, int, int, int]  # x, y, w, h
    corner_points: List[List[int]]  # Reordered corner points


@dataclass
class MeasurementResult:
    """Complete measurement result"""

    success: bool
    message: str
    objects: List[MeasuredObject]
    reference_detected: bool
    processed_image_base64: Optional[str] = None


def get_contours(
    img: np.ndarray,
    canny_thresholds: Tuple[int, int] = (100, 100),
    min_area: int = 1000,
    corner_filter: int = 0,
) -> Tuple[np.ndarray, List]:
    """
    Detect contours in an image using edge detection.

    Args:
        img: Input BGR image
        canny_thresholds: (low, high) thresholds for Canny edge detection
        min_area: Minimum contour area to consider
        corner_filter: If > 0, only return contours with exactly this many corners

    Returns:
        Tuple of (image, list of contour data)
        Each contour data: [corner_count, area, approx_points, bounding_box, raw_contour]
    """
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img_blur = cv2.GaussianBlur(img_gray, (5, 5), 1)
    img_canny = cv2.Canny(img_blur, canny_thresholds[0], canny_thresholds[1])

    kernel = np.ones((5, 5))
    img_dilated = cv2.dilate(img_canny, kernel, iterations=3)
    img_threshold = cv2.erode(img_dilated, kernel, iterations=2)

    contours, _ = cv2.findContours(
        img_threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    final_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area > min_area:
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
            bbox = cv2.boundingRect(approx)

            if corner_filter > 0:
                if len(approx) == corner_filter:
                    final_contours.append([len(approx), area, approx, bbox, contour])
            else:
                final_contours.append([len(approx), area, approx, bbox, contour])

    # Sort by area (largest first)
    final_contours = sorted(final_contours, key=lambda x: x[1], reverse=True)

    return img, final_contours


def reorder_points(points: np.ndarray) -> np.ndarray:
    """
    Reorder 4 corner points to consistent order:
    [top-left, top-right, bottom-left, bottom-right]

    Args:
        points: Array of 4 points

    Returns:
        Reordered points array
    """
    points_new = np.zeros_like(points)
    points = points.reshape((4, 2))

    # Sum of coordinates: smallest = top-left, largest = bottom-right
    point_sum = points.sum(1)
    points_new[0] = points[np.argmin(point_sum)]  # Top-left
    points_new[3] = points[np.argmax(point_sum)]  # Bottom-right

    # Difference of coordinates: smallest = top-right, largest = bottom-left
    point_diff = np.diff(points, axis=1)
    points_new[1] = points[np.argmin(point_diff)]  # Top-right
    points_new[2] = points[np.argmax(point_diff)]  # Bottom-left

    return points_new


def warp_image(
    img: np.ndarray, points: np.ndarray, width: int, height: int, padding: int = 20
) -> np.ndarray:
    """
    Apply perspective transformation to get bird's eye view.

    Args:
        img: Input image
        points: 4 corner points of the region to transform
        width: Output width
        height: Output height
        padding: Padding to remove from edges

    Returns:
        Warped image
    """
    points = reorder_points(points)
    pts1 = np.float32(points)
    pts2 = np.float32([[0, 0], [width, 0], [0, height], [width, height]])

    matrix = cv2.getPerspectiveTransform(pts1, pts2)
    img_warp = cv2.warpPerspective(img, matrix, (width, height))

    # Remove padding from edges
    if padding > 0:
        img_warp = img_warp[
            padding : img_warp.shape[0] - padding, padding : img_warp.shape[1] - padding
        ]

    return img_warp


def calculate_distance(pt1: np.ndarray, pt2: np.ndarray) -> float:
    """Calculate Euclidean distance between two points."""
    return float(((pt2[0] - pt1[0]) ** 2 + (pt2[1] - pt1[1]) ** 2) ** 0.5)


def measure_objects(
    image: np.ndarray,
    scale: int = 3,
    reference_width_mm: int = 210,
    reference_height_mm: int = 297,
) -> MeasurementResult:
    """
    Main function to measure objects in an image using A4 paper as reference.

    Args:
        image: Input BGR image
        scale: Scale factor for processing
        reference_width_mm: Reference object width in mm (A4 = 210mm)
        reference_height_mm: Reference object height in mm (A4 = 297mm)

    Returns:
        MeasurementResult with all measured objects
    """
    # Calculate warped image dimensions (in pixels, scaled)
    warp_width = reference_width_mm * scale
    warp_height = reference_height_mm * scale

    # Step 1: Find the reference paper (A4) - looking for 4-sided shapes
    _, contours = get_contours(image, min_area=50000, corner_filter=4)

    if len(contours) == 0:
        return MeasurementResult(
            success=False,
            message="No A4 paper detected. Please ensure the paper is clearly visible with good lighting.",
            objects=[],
            reference_detected=False,
        )

    # Get the largest 4-sided contour (should be the A4 paper)
    biggest_contour = contours[0][2]

    # Step 2: Warp perspective to get bird's eye view of the paper
    img_warped = warp_image(image, biggest_contour, warp_width, warp_height)

    # Step 3: Find objects on the paper
    img_result, object_contours = get_contours(
        img_warped, min_area=2000, corner_filter=4, canny_thresholds=(50, 50)
    )

    measured_objects = []

    for obj in object_contours:
        approx_points = obj[2]
        bbox = obj[3]

        # Reorder corner points
        corner_points = reorder_points(approx_points)

        # Calculate dimensions in cm (divide by scale to get mm, then by 10 for cm)
        width_cm = round(
            calculate_distance(corner_points[0][0] / scale, corner_points[1][0] / scale)
            / 10,
            1,
        )
        height_cm = round(
            calculate_distance(corner_points[0][0] / scale, corner_points[2][0] / scale)
            / 10,
            1,
        )

        # Draw on result image
        cv2.polylines(img_result, [approx_points], True, (0, 255, 0), 2)

        # Draw measurement arrows
        cv2.arrowedLine(
            img_result,
            tuple(corner_points[0][0]),
            tuple(corner_points[1][0]),
            (255, 0, 255),
            3,
            8,
            0,
            0.05,
        )
        cv2.arrowedLine(
            img_result,
            tuple(corner_points[0][0]),
            tuple(corner_points[2][0]),
            (255, 0, 255),
            3,
            8,
            0,
            0.05,
        )

        # Add measurement text
        x, y, w, h = bbox
        cv2.putText(
            img_result,
            f"{width_cm}cm",
            (x + 30, y - 10),
            cv2.FONT_HERSHEY_COMPLEX_SMALL,
            1.5,
            (255, 0, 255),
            2,
        )
        cv2.putText(
            img_result,
            f"{height_cm}cm",
            (x - 70, y + h // 2),
            cv2.FONT_HERSHEY_COMPLEX_SMALL,
            1.5,
            (255, 0, 255),
            2,
        )

        measured_objects.append(
            MeasuredObject(
                width_cm=width_cm,
                height_cm=height_cm,
                contour_points=approx_points.tolist(),
                bounding_box=bbox,
                corner_points=corner_points.tolist(),
            )
        )

    # Convert result image to base64
    import base64

    _, buffer = cv2.imencode(".jpg", img_result, [cv2.IMWRITE_JPEG_QUALITY, 90])
    img_base64 = base64.b64encode(buffer).decode("utf-8")

    return MeasurementResult(
        success=True,
        message=f"Successfully measured {len(measured_objects)} object(s)",
        objects=measured_objects,
        reference_detected=True,
        processed_image_base64=img_base64,
    )
