export const CAMERA_VIEWS = [
  {
    id: 'three-quarter',
    label: 'Три четверти',
    direction: [-3, 2.1, 6],
    targetOffset: [0, 0.06, 0],
  },
  { id: 'side', label: 'Сбоку', direction: [0, 0.12, 1], targetOffset: [0, 0, 0] },
  {
    id: 'top',
    label: 'Сверху',
    // Avoid the singularity between camera.up and the camera's gaze.
    direction: [0, 1, 0.04],
    targetOffset: [0, 0, 0],
  },
] as const

export type CameraViewId = (typeof CAMERA_VIEWS)[number]['id']
export const DEFAULT_CAMERA_VIEW: CameraViewId = 'three-quarter'
export function isCameraViewId(value: unknown): value is CameraViewId {
  return CAMERA_VIEWS.some((view) => view.id === value)
}
export function getCameraView(id: CameraViewId) {
  return CAMERA_VIEWS.find((view) => view.id === id) ?? CAMERA_VIEWS[0]
}
