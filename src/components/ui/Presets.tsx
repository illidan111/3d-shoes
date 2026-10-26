import { configsEqual, getColor } from '../../config/parts'
import { PRESETS } from '../../config/presets'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'

export function Presets() {
  const config = useConfigStore((state) => state.config)
  const applyConfig = useConfigStore((state) => state.applyConfig)
  return (
    <section className="preset-section desktop-feature" aria-labelledby="presets-title">
      <h2 id="presets-title">Готовые палитры</h2>
      <div className="preset-list">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="preset-button"
            aria-pressed={configsEqual(config, preset.config)}
            title={preset.description}
            onClick={() => {
              applyConfig(preset.config)
              useUiStore.getState().activateScene()
              useUiStore.getState().announce(`Палитра «${preset.name}» применена ко всей паре.`)
            }}
          >
            <span className="preset-colors" aria-hidden="true">
              {[preset.config.body, preset.config.sole, preset.config.lace].map((part, index) => (
                <span key={index} style={{ backgroundColor: getColor(part.color).hex }} />
              ))}
            </span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
