import type { KeyboardEvent } from 'react'

/** Roving tabindex: one stop per group, arrow keys stay inside the group. */
export function navigateRadioGroup(event: KeyboardEvent<HTMLElement>) {
  const offsets: Record<string, number> = {
    ArrowRight: 1,
    ArrowDown: 1,
    ArrowLeft: -1,
    ArrowUp: -1,
  }
  const offset = offsets[event.key]
  if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return
  const items = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'),
  )
  const current = items.indexOf(document.activeElement as HTMLButtonElement)
  if (!items.length || current < 0) return
  event.preventDefault()
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (current + (offset ?? 0) + items.length) % items.length
  items[index]?.focus()
  items[index]?.click()
}
