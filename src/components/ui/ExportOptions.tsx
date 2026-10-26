import { navigateRadioGroup } from '../../lib/radioNavigation'
import { useUiStore } from '../../stores/uiStore'

const OPTIONS = [
  { id: 'viewport', label: 'Экран', title: 'Текущее разрешение сцены' },
  { id: '2048', label: '2048 px', title: '2048 пикселей по длинной стороне' },
] as const

export function ExportOptions() {
  const size = useUiStore((state) => state.screenshotSize)
  const setSize = useUiStore((state) => state.setScreenshotSize)
  const busy = useUiStore((state) => state.screenshotBusy)
  return (
    <div
      className="export-options desktop-feature"
      role="radiogroup"
      aria-label="Разрешение PNG"
      onKeyDown={navigateRadioGroup}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          disabled={busy}
          aria-checked={size === option.id}
          tabIndex={size === option.id ? 0 : -1}
          title={option.title}
          onClick={() => setSize(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
