import { describe, expect, it } from 'vitest'
import { isEditableTarget } from '../lib/a11y'

describe('editable keyboard targets', () => {
  it('recognizes contenteditable descendants and text inputs', () => {
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const span = document.createElement('span')
    editable.append(span)
    expect(isEditableTarget(span)).toBe(true)
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true)
    expect(isEditableTarget(document.createElement('input'))).toBe(true)
  })

  it('allows application shortcuts on buttons and noneditable regions', () => {
    const button = document.createElement('button')
    button.setAttribute('contenteditable', 'false')
    expect(isEditableTarget(button)).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
    expect(isEditableTarget(window)).toBe(false)
  })
})
