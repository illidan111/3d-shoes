import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { Icon } from './Icon'

export function Toolbar() {
  const canUndo = useConfigStore((state) => state.past.length > 0)
  const canRedo = useConfigStore((state) => state.future.length > 0)
  const undo = useConfigStore((state) => state.undo)
  const redo = useConfigStore((state) => state.redo)
  const resetView = useUiStore((state) => state.resetView)
  const announce = useUiStore((state) => state.announce)
  return (
    <div className="view-toolbar" role="toolbar" aria-label="История и камера">
      <button
        type="button"
        className="icon-button"
        aria-label="Отменить изменение"
        title="Отменить (Ctrl / ⌘ Z)"
        disabled={!canUndo}
        onClick={() => {
          undo()
          announce('Изменение отменено')
        }}
      >
        <Icon name="undo" />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label="Повторить изменение"
        title="Повторить (Ctrl / ⌘ Shift Z)"
        disabled={!canRedo}
        onClick={() => {
          redo()
          announce('Изменение повторено')
        }}
      >
        <Icon name="redo" />
      </button>
      <span className="toolbar-divider" />
      <button type="button" className="reset-view" onClick={resetView}>
        Сбросить вид
      </button>
    </div>
  )
}
