import { create } from 'zustand'
import {
  cloneConfig,
  configsEqual,
  DEFAULT_CONFIG,
  isColorId,
  isMaterialId,
  isPartId,
  isShoeConfig,
  type PartConfig,
  type PartId,
  type ShoeConfig,
} from '../config/parts'

export const HISTORY_LIMIT = 50
export const EDIT_GROUP_WINDOW_MS = 400

interface EditGroup {
  part: PartId
  at: number
}

export interface ConfigState {
  selectedPart: PartId
  config: ShoeConfig
  past: ShoeConfig[]
  future: ShoeConfig[]
  editGroup: EditGroup | null
  selectPart: (id: PartId) => void
  updatePart: (id: PartId, patch: Partial<PartConfig>, now?: number) => void
  undo: () => void
  redo: () => void
  resetConfig: () => void
  loadConfig: (config: unknown) => void
}

function appendHistory(past: ShoeConfig[], config: ShoeConfig): ShoeConfig[] {
  return [...past, cloneConfig(config)].slice(-HISTORY_LIMIT)
}

export const useConfigStore = create<ConfigState>((set) => ({
  selectedPart: 'body',
  config: cloneConfig(DEFAULT_CONFIG),
  past: [],
  future: [],
  editGroup: null,
  selectPart: (id) => {
    if (!isPartId(id)) return
    set((state) => (state.selectedPart === id ? state : { selectedPart: id, editGroup: null }))
  },
  updatePart: (id, patch, now = Date.now()) => {
    if (!isPartId(id) || typeof patch !== 'object' || patch === null) return
    const at = Number.isFinite(now) ? now : Date.now()
    set((state) => {
      const previous = state.config[id]
      const next: PartConfig = {
        color: isColorId(patch.color) ? patch.color : previous.color,
        material: isMaterialId(patch.material) ? patch.material : previous.material,
      }
      if (next.color === previous.color && next.material === previous.material) return state
      const elapsed = state.editGroup === null ? Infinity : at - state.editGroup.at
      const grouped =
        state.editGroup?.part === id &&
        elapsed >= 0 &&
        elapsed <= EDIT_GROUP_WINDOW_MS &&
        state.future.length === 0 &&
        state.past.length > 0
      return {
        config: { ...state.config, [id]: next },
        past: grouped ? state.past : appendHistory(state.past, state.config),
        future: [],
        editGroup: { part: id, at },
      }
    })
  },
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return { editGroup: null }
      return {
        config: cloneConfig(previous),
        past: state.past.slice(0, -1),
        future: [cloneConfig(state.config), ...state.future].slice(0, HISTORY_LIMIT),
        editGroup: null,
      }
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0]
      if (!next) return { editGroup: null }
      return {
        config: cloneConfig(next),
        past: appendHistory(state.past, state.config),
        future: state.future.slice(1),
        editGroup: null,
      }
    }),
  resetConfig: () =>
    set((state) => {
      if (configsEqual(state.config, DEFAULT_CONFIG)) return { editGroup: null, future: [] }
      return {
        config: cloneConfig(DEFAULT_CONFIG),
        past: appendHistory(state.past, state.config),
        future: [],
        editGroup: null,
      }
    }),
  loadConfig: (config) => {
    if (!isShoeConfig(config)) return
    set({ config: cloneConfig(config), past: [], future: [], editGroup: null })
  },
}))
