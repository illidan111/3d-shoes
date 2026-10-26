import { create } from 'zustand'
import { isPartId, type PartId } from '../config/parts'
import { shouldStartScene } from '../lib/sceneActivation'

export interface UiState {
  sceneActivated: boolean
  activateScene: () => void
  viewRevision: number
  resetView: () => void
  screenshotRequested: number
  requestScreenshot: () => void
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
  resetView: () => set((state) => ({ viewRevision: state.viewRevision + 1, sceneActivated: true })),
  screenshotRequested: 0,
  requestScreenshot: () => set((state) => ({ screenshotRequested: state.screenshotRequested + 1 })),
  sceneReady: false,
  setSceneReady: (ready) => {
    if (typeof ready === 'boolean') set({ sceneReady: ready })
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
