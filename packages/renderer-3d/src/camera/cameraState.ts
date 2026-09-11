import type { BoardCameraBounds } from "@TBS/presentation";

import { projectCameraBounds } from "../board/projection.js";

export type StrategyCameraState = Readonly<{
  targetX: number;
  targetZ: number;
  zoom: number;
  rotationStep: number;
}>;

export type CameraIntent = "pan-down" | "pan-left" | "pan-right" | "pan-up" | "rotate" | "zoom-in" | "zoom-out";

const MINIMUM_ZOOM = 0.65;
const MAXIMUM_ZOOM = 2.2;
const PAN_STEP = 0.85;
const CAMERA_DISTANCE = 12;
const CAMERA_HEIGHT = 11;
const INITIAL_CAMERA_AZIMUTH = Math.PI / 2;

export const initialCameraState = (bounds: BoardCameraBounds): StrategyCameraState => {
  const { center } = projectCameraBounds(bounds);
  return { targetX: center.x, targetZ: center.z, zoom: 1, rotationStep: 0 };
};

export const cameraPosition = (state: StrategyCameraState): Readonly<{ x: number; y: number; z: number }> => {
  const azimuth = INITIAL_CAMERA_AZIMUTH + (state.rotationStep * Math.PI / 3);
  return {
    x: state.targetX + (Math.cos(azimuth) * CAMERA_DISTANCE),
    y: CAMERA_HEIGHT,
    z: state.targetZ + (Math.sin(azimuth) * CAMERA_DISTANCE),
  };
};

export const updateCameraState = (
  state: StrategyCameraState,
  intent: CameraIntent,
  bounds: BoardCameraBounds,
): StrategyCameraState => {
  const projected = projectCameraBounds(bounds);
  const minimumX = Math.min(projected.minimum.x, projected.maximum.x) - 1;
  const maximumX = Math.max(projected.minimum.x, projected.maximum.x) + 1;
  const minimumZ = Math.min(projected.minimum.z, projected.maximum.z) - 1;
  const maximumZ = Math.max(projected.minimum.z, projected.maximum.z) + 1;
  const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

  switch (intent) {
    case "pan-down": return { ...state, targetZ: clamp(state.targetZ + PAN_STEP, minimumZ, maximumZ) };
    case "pan-left": return { ...state, targetX: clamp(state.targetX - PAN_STEP, minimumX, maximumX) };
    case "pan-right": return { ...state, targetX: clamp(state.targetX + PAN_STEP, minimumX, maximumX) };
    case "pan-up": return { ...state, targetZ: clamp(state.targetZ - PAN_STEP, minimumZ, maximumZ) };
    case "rotate": return { ...state, rotationStep: (state.rotationStep + 1) % 6 };
    case "zoom-in": return { ...state, zoom: clamp(state.zoom * 1.2, MINIMUM_ZOOM, MAXIMUM_ZOOM) };
    case "zoom-out": return { ...state, zoom: clamp(state.zoom / 1.2, MINIMUM_ZOOM, MAXIMUM_ZOOM) };
  }
};
