import {
  getColor,
  getMaterial,
  getPart,
  PARTS,
  type PartId,
  type ShoeConfig,
} from '../config/parts'

/** Keyboard history shortcuts must leave editing controls to the browser. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false
  if (target instanceof HTMLElement && target.isContentEditable) return true
  if (target.closest('input, textarea, select, [role="textbox"]')) return true
  const editable = target.closest('[contenteditable]')
  return editable !== null && editable.getAttribute('contenteditable') !== 'false'
}

export function getPartDescription(id: PartId, config: ShoeConfig): string {
  const { color, material } = config[id]
  return `${getPart(id).label}: ${getColor(color).label}, ${getMaterial(material).label.toLocaleLowerCase('ru')}`
}

export function getConfigurationDescription(config: ShoeConfig): string {
  return PARTS.map(({ id }) => getPartDescription(id, config)).join('. ')
}
