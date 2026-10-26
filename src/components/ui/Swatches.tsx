import { COLORS, MATERIALS, getColor, getMaterial, getPart } from '../../config/parts'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { navigateRadioGroup } from '../../lib/radioNavigation'

export function Swatches() {
  const partId = useConfigStore((state) => state.selectedPart)
  const partConfig = useConfigStore((state) => state.config[state.selectedPart])
  const updatePart = useConfigStore((state) => state.updatePart)
  const announce = useUiStore((state) => state.announce)
  const currentColor = getColor(partConfig.color)
  const currentMaterial = getMaterial(partConfig.material)

  return (
    <div className="options">
      <div className="option-heading">
        <h3 id="color-label">Цвет</h3>
        <span>{currentColor.label}</span>
      </div>
      <div
        className="swatches"
        role="radiogroup"
        aria-labelledby="color-label"
        onKeyDown={navigateRadioGroup}
      >
        {COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={partConfig.color === color.id}
            aria-label={color.label}
            title={color.label}
            tabIndex={partConfig.color === color.id ? 0 : -1}
            className="swatch"
            style={{ '--swatch': color.hex } as React.CSSProperties}
            onClick={() => {
              updatePart(partId, { color: color.id })
              useUiStore.getState().activateScene()
              announce(
                `${getPart(partId).label}: ${color.label.toLowerCase()}, ${currentMaterial.label.toLowerCase()}`,
              )
            }}
          >
            <span />
          </button>
        ))}
      </div>
      <h3 id="material-label" className="material-title">
        Материал
      </h3>
      <div
        className="materials"
        role="radiogroup"
        aria-labelledby="material-label"
        onKeyDown={navigateRadioGroup}
      >
        {MATERIALS.map((material) => (
          <button
            key={material.id}
            type="button"
            role="radio"
            aria-checked={partConfig.material === material.id}
            tabIndex={partConfig.material === material.id ? 0 : -1}
            onClick={() => {
              updatePart(partId, { material: material.id })
              useUiStore.getState().activateScene()
              announce(
                `${getPart(partId).label}: ${currentColor.label.toLowerCase()}, ${material.label.toLowerCase()}`,
              )
            }}
          >
            {material.label}
          </button>
        ))}
      </div>
      <p className="material-description">{currentMaterial.description}</p>
    </div>
  )
}
