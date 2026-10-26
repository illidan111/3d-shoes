import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'

export function ComparisonControls() {
  const snapshot = useConfigStore((state) => state.comparisonSnapshot)
  const isComparing = useConfigStore((state) => state.isComparing)
  const remember = useConfigStore((state) => state.rememberComparison)
  const toggle = useConfigStore((state) => state.toggleComparison)
  return (
    <div className="comparison-controls desktop-feature" role="group" aria-label="Сравнение A/B">
      <button
        type="button"
        className="comparison-save"
        disabled={isComparing}
        onClick={() => {
          remember()
          useUiStore.getState().announce('Вариант A сохранён. Измени пару и сравни результат.')
        }}
      >
        {snapshot ? 'Обновить A' : 'Запомнить A'}
      </button>
      <button
        type="button"
        className="comparison-toggle"
        disabled={!snapshot}
        aria-pressed={isComparing}
        onClick={() => {
          toggle()
          useUiStore.getState().activateScene()
          useUiStore
            .getState()
            .announce(
              isComparing ? 'Восстановлен твой вариант B.' : 'Показан сохранённый вариант A.',
            )
        }}
      >
        {isComparing ? 'Вернуться к B' : 'Показать A'}
      </button>
      <span className="comparison-hint">
        {!snapshot
          ? 'Сохрани вариант для сравнения'
          : isComparing
            ? 'Вариант A · изменение создаст новый B'
            : 'Вариант B · A сохранён до перезагрузки'}
      </span>
    </div>
  )
}
