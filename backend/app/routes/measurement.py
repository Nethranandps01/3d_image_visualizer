"""
API route handlers for measurement endpoints
"""

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import base64
from io import BytesIO
from PIL import Image

from app.models.schemas import (
    MeasurementResponse,
    MeasuredObjectResponse,
    ErrorResponse,
)
from app.utils.image_processing import measure_objects

router = APIRouter(prefix="/api/v1", tags=["measurement"])


@router.post(
    "/measure",
    response_model=MeasurementResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image"},
        500: {"model": ErrorResponse, "description": "Processing error"},
    },
    summary="Measure objects in an image",
    description="""
    Upload an image containing an A4 paper with objects on it.
    The API will detect the A4 paper, use it as a reference, and measure
    all rectangular objects placed on it.
    
    **Requirements:**
    - Image must contain a clearly visible A4 paper
    - Objects to measure should be rectangular and placed on the paper
    - Good lighting conditions for best results
    
    **Returns:**
    - Measurements in centimeters for each detected object
    - Annotated image with measurements drawn
    """,
)
async def measure_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG)"),
):
    """Process uploaded image and measure objects"""

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (JPEG, PNG)")

    try:
        # Read image file
        contents = await file.read()

        # Convert to numpy array
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode image. Please ensure it's a valid image file.",
            )

        # Process the image
        result = measure_objects(image)

        # Build response
        measured_objects = [
            MeasuredObjectResponse(
                width_cm=obj.width_cm,
                height_cm=obj.height_cm,
                bounding_box=obj.bounding_box,
            )
            for obj in result.objects
        ]

        return MeasurementResponse(
            success=result.success,
            message=result.message,
            reference_detected=result.reference_detected,
            objects=measured_objects,
            processed_image=result.processed_image_base64,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@router.post(
    "/measure/base64",
    response_model=MeasurementResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid image data"},
        500: {"model": ErrorResponse, "description": "Processing error"},
    },
    summary="Measure objects from base64 image",
    description="Same as /measure but accepts base64 encoded image in request body",
)
async def measure_base64(data: dict):
    """Process base64 encoded image and measure objects"""

    if "image" not in data:
        raise HTTPException(
            status_code=400,
            detail="Request must contain 'image' field with base64 encoded image",
        )

    try:
        # Decode base64 image
        image_data = data["image"]

        # Remove data URL prefix if present
        if "," in image_data:
            image_data = image_data.split(",")[1]

        # Decode base64
        image_bytes = base64.b64decode(image_data)

        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise HTTPException(
                status_code=400, detail="Could not decode image from base64 data"
            )

        # Process the image
        result = measure_objects(image)

        # Build response
        measured_objects = [
            MeasuredObjectResponse(
                width_cm=obj.width_cm,
                height_cm=obj.height_cm,
                bounding_box=obj.bounding_box,
            )
            for obj in result.objects
        ]

        return MeasurementResponse(
            success=result.success,
            message=result.message,
            reference_detected=result.reference_detected,
            objects=measured_objects,
            processed_image=result.processed_image_base64,
        )

    except HTTPException:
        raise
    except base64.binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
