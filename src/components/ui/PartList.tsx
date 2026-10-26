import { PARTS, getColor } from '../../config/parts'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { navigateRadioGroup } from '../../lib/radioNavigation'
import { Icon } from './Icon'

export function PartList() {
  const selectedPart = useConfigStore((state) => state.selectedPart)
  const config = useConfigStore((state) => state.config)
  const selectPart = useConfigStore((state) => state.selectPart)
  return (
    <div
      role="radiogroup"
      aria-label="Часть кроссовка"
      className="part-list"
      onKeyDown={navigateRadioGroup}
    >
      {PARTS.map((part, index) => (
        <button
          key={part.id}
          type="button"
          role="radio"
          aria-checked={selectedPart === part.id}
          tabIndex={selectedPart === part.id ? 0 : -1}
          className="part-row"
          onClick={() => {
            selectPart(part.id)
            useUiStore.getState().activateScene()
          }}
        >
          <span className="part-number">{String(index + 1).padStart(2, '0')}</span>
          <span className="part-name">{part.label}</span>
          <span
            className="part-color"
            style={{ backgroundColor: getColor(config[part.id].color).hex }}
            aria-hidden="true"
          />
          <Icon name="arrow" size={19} />
        </button>
      ))}
    </div>
  )
}
