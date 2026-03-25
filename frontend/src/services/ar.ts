/**
 * AR Service for 3D Measurement
 * Handles coordinate systems and distance calculations
 */

// import * as THREE from 'three'; // Removed unused import

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoxDimensions {
  width: number;
  height: number;
  length: number;
}

/**
 * Calculate Euclidean distance between two 3D points
 * Result is in meters (standard for WebXR/ARCore)
 */
export function calculate3DDistance(p1: Vector3D, p2: Vector3D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Convert meters to centimeters
 */
export function toCm(meters: number): number {
  return parseFloat((meters * 100).toFixed(1));
}

/**
 * Create a 3D box geometry from 3 points (origin, width-end, height-end)
 * This is a simplified version of what's shown in the images
 */
export function createBoxFromPoints(points: Vector3D[]): BoxDimensions {
  if (points.length < 3) {
    throw new Error('Need at least 3 points to define 3D dimensions');
  }

  const width = calculate3DDistance(points[0], points[1]);
  const height = calculate3DDistance(points[0], points[2]);
  
  // Assuming the 3rd dimension is derived if 4th point is missing
  const length = points.length > 3 
    ? calculate3DDistance(points[0], points[3]) 
    : width; // Default to square base if length not provided

  return {
    width: toCm(width),
    height: toCm(height),
    length: toCm(length),
  };
}

/**
 * Helper to check if WebXR is available
 */
export async function isARSupported(): Promise<boolean> {
  if ('xr' in navigator) {
    const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
    return !!isSupported;
  }
  return false;
}
