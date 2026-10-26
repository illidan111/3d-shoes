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
  /** Keep a capacity eviction until the group is known to contain a real change. */
  discardedHistory?: ShoeConfig
}

export interface ConfigState {
  selectedPart: PartId
  config: ShoeConfig
  past: ShoeConfig[]
  future: ShoeConfig[]
  editGroup: EditGroup | null
  /** Saved A survives edits, presets, reset, undo, and redo; URL load clears it. */
  comparisonSnapshot: ShoeConfig | null
  /** Return destination B exists only while A is being previewed. */
  comparisonDraft: ShoeConfig | null
  isComparing: boolean
  selectPart: (id: PartId) => void
  updatePart: (id: PartId, patch: Partial<PartConfig>, now?: number) => void
  applyConfig: (config: unknown) => void
  rememberComparison: () => void
  /** Every changed visible configuration is undoable; history does not restore preview mode. */
  toggleComparison: () => void
  undo: () => void
  redo: () => void
  resetConfig: () => void
  loadConfig: (config: unknown) => void
}

function appendHistory(past: ShoeConfig[], config: ShoeConfig): ShoeConfig[] {
  return [...past, cloneConfig(config)].slice(-HISTORY_LIMIT)
}

/** A is detached from live edits and cannot be mutated through a store reference. */
function freezeSnapshot(config: ShoeConfig): ShoeConfig {
  const snapshot = cloneConfig(config)
  Object.values(snapshot).forEach(Object.freeze)
  return Object.freeze(snapshot)
}

const exitComparison = { isComparing: false, comparisonDraft: null, editGroup: null } as const

export const useConfigStore = create<ConfigState>((set) => ({
  selectedPart: 'body',
  config: cloneConfig(DEFAULT_CONFIG),
  past: [],
  future: [],
  editGroup: null,
  comparisonSnapshot: null,
  comparisonDraft: null,
  isComparing: false,
  selectPart: (id) => {
    if (!isPartId(id)) return
    set((state) => (state.selectedPart === id ? state : { selectedPart: id, editGroup: null }))
  },
  updatePart: (id, patch, now = Date.now()) => {
    if (!isPartId(id) || typeof patch !== 'object' || patch === null) return
    if (!isColorId(patch.color) && !isMaterialId(patch.material)) return
    const at = Number.isFinite(now) ? now : Date.now()
    set((state) => {
      const previous = state.config[id]
      const next: PartConfig = {
        color: isColorId(patch.color) ? patch.color : previous.color,
        material: isMaterialId(patch.material) ? patch.material : previous.material,
      }
      if (next.color === previous.color && next.material === previous.material)
        return state.isComparing ? exitComparison : state
      const elapsed = state.editGroup === null ? Infinity : at - state.editGroup.at
      const grouped =
        !state.isComparing &&
        state.editGroup?.part === id &&
        elapsed >= 0 &&
        elapsed <= EDIT_GROUP_WINDOW_MS &&
        state.future.length === 0 &&
        state.past.length > 0
      const config = { ...state.config, [id]: next }
      const groupStart = grouped ? state.past.at(-1) : undefined
      const discardedHistory = grouped
        ? state.editGroup?.discardedHistory
        : state.past.length >= HISTORY_LIMIT
          ? state.past[0]
          : undefined
      // A quick experiment that returns to its starting point is not an undo step.
      const revertedGroup = groupStart !== undefined && configsEqual(config, groupStart)
      const retainedHistory = revertedGroup ? state.past.slice(0, -1) : state.past
      return {
        ...exitComparison,
        // Editing visible A creates a new B. The old B remains in past from entry.
        config,
        past: revertedGroup
          ? discardedHistory
            ? [discardedHistory, ...retainedHistory]
            : retainedHistory
          : grouped
            ? state.past
            : appendHistory(state.past, state.config),
        future: [],
        editGroup: revertedGroup ? null : { part: id, at, discardedHistory },
      }
    })
  },
  applyConfig: (config) => {
    if (!isShoeConfig(config)) return
    set((state) => {
      // A valid no-op is a command boundary, but must not erase an available redo.
      if (configsEqual(state.config, config)) return exitComparison
      return {
        ...exitComparison,
        config: cloneConfig(config),
        past: appendHistory(state.past, state.config),
        future: [],
      }
    })
  },
  rememberComparison: () =>
    set((state) => ({
      ...exitComparison,
      comparisonSnapshot: freezeSnapshot(state.config),
    })),
  toggleComparison: () =>
    set((state) => {
      if (!state.comparisonSnapshot) return state
      const next = state.isComparing ? state.comparisonDraft : state.comparisonSnapshot
      if (!next) return exitComparison
      const changed = !configsEqual(state.config, next)
      return {
        config: changed ? cloneConfig(next) : state.config,
        past: changed ? appendHistory(state.past, state.config) : state.past,
        future: changed ? [] : state.future,
        editGroup: null,
        comparisonDraft: state.isComparing ? null : freezeSnapshot(state.config),
        isComparing: !state.isComparing,
      }
    }),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return exitComparison
      return {
        ...exitComparison,
        config: cloneConfig(previous),
        past: state.past.slice(0, -1),
        future: [cloneConfig(state.config), ...state.future].slice(0, HISTORY_LIMIT),
      }
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0]
      if (!next) return exitComparison
      return {
        ...exitComparison,
        config: cloneConfig(next),
        past: appendHistory(state.past, state.config),
        future: state.future.slice(1),
      }
    }),
  resetConfig: () =>
    set((state) => {
      if (configsEqual(state.config, DEFAULT_CONFIG)) return { ...exitComparison, future: [] }
      return {
        ...exitComparison,
        config: cloneConfig(DEFAULT_CONFIG),
        past: appendHistory(state.past, state.config),
        future: [],
      }
    }),
  loadConfig: (config) => {
    if (!isShoeConfig(config)) return
    set({
      ...exitComparison,
      config: cloneConfig(config),
      past: [],
      future: [],
      comparisonSnapshot: null,
    })
  },
}))
