import { create } from 'zustand'
import { isPartId, type PartId } from '../config/parts'
import { shouldStartScene } from '../lib/sceneActivation'
import { DEFAULT_CAMERA_VIEW, isCameraViewId, type CameraViewId } from '../config/views'
import type { ScreenshotSize } from '../lib/screenshot'

export type { ScreenshotSize } from '../lib/screenshot'

export interface UiState {
  sceneActivated: boolean
  activateScene: () => void
  viewRevision: number
  resetView: () => void
  cameraView: CameraViewId | null
  setCameraView: (view: CameraViewId) => void
  clearCameraView: () => void
  screenshotRequested: number
  requestScreenshot: () => void
  screenshotSize: ScreenshotSize
  setScreenshotSize: (size: ScreenshotSize) => void
  screenshotBusy: boolean
  setScreenshotBusy: (busy: boolean) => void
  sceneReady: boolean
  setSceneReady: (ready: boolean) => void
  notice: string
  noticeRevision: number
  announce: (message: string) => void
  quality: 'high' | 'low'
  setQuality: (quality: 'high' | 'low') => void
  hoveredPart: PartId | null
  setHoveredPart: (part: PartId | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  sceneActivated:
    typeof window === 'undefined' ||
    shouldStartScene(window.matchMedia('(max-width: 768px)').matches, window.location.search),
  activateScene: () => set({ sceneActivated: true }),
  viewRevision: 0,
  resetView: () =>
    set((state) => ({
      viewRevision: state.viewRevision + 1,
      sceneActivated: true,
      cameraView: DEFAULT_CAMERA_VIEW,
    })),
  cameraView: DEFAULT_CAMERA_VIEW,
  setCameraView: (view) => {
    if (isCameraViewId(view))
      set((state) => ({
        cameraView: view,
        viewRevision: state.viewRevision + 1,
        sceneActivated: true,
      }))
  },
  clearCameraView: () => set({ cameraView: null }),
  screenshotRequested: 0,
  requestScreenshot: () =>
    set((state) =>
      state.screenshotBusy || !state.sceneReady
        ? state
        : { screenshotRequested: state.screenshotRequested + 1 },
    ),
  screenshotSize: 'viewport',
  setScreenshotSize: (size) => {
    if (size === 'viewport' || size === '2048') set({ screenshotSize: size })
  },
  screenshotBusy: false,
  setScreenshotBusy: (busy) => set({ screenshotBusy: busy }),
  sceneReady: false,
  setSceneReady: (ready) => {
    if (typeof ready === 'boolean')
      set(
        ready
          ? { sceneReady: true }
          : { sceneReady: false, hoveredPart: null, screenshotBusy: false },
      )
  },
  notice: '',
  noticeRevision: 0,
  announce: (message) => {
    if (typeof message === 'string')
      set((state) => ({ notice: message, noticeRevision: state.noticeRevision + 1 }))
  },
  quality: 'high',
  setQuality: (quality) => {
    if (quality === 'high' || quality === 'low') set({ quality })
  },
  hoveredPart: null,
  setHoveredPart: (part) => {
    if (part === null || isPartId(part)) set({ hoveredPart: part })
  },
}))
