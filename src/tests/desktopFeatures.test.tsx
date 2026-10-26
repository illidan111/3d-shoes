import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config/parts'
import { PRESETS } from '../config/presets'
import { CAMERA_VIEWS } from '../config/views'
import { CameraViews } from '../components/ui/CameraViews'
import { ComparisonControls } from '../components/ui/ComparisonControls'
import { ExportOptions } from '../components/ui/ExportOptions'
import { Presets } from '../components/ui/Presets'
import { Swatches } from '../components/ui/Swatches'
import { Toolbar } from '../components/ui/Toolbar'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

function resetStores() {
  useConfigStore.getState().loadConfig(DEFAULT_CONFIG)
  useConfigStore.getState().selectPart('body')
  useUiStore.setState({ ...useUiStore.getInitialState(), sceneActivated: false }, true)
}

beforeEach(resetStores)
afterEach(() => {
  cleanup()
  resetStores()
})

describe('desktop presets', () => {
  it('applies all preset parts as one undo step and exposes its active state', async () => {
    const user = userEvent.setup()
    const preset = PRESETS[2]
    render(
      <>
        <Presets />
        <Toolbar />
      </>,
    )

    await user.click(screen.getByRole('button', { name: preset.name }))
    expect(useConfigStore.getState().config).toEqual(preset.config)
    expect(useConfigStore.getState().past).toHaveLength(1)
    expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(useUiStore.getState().sceneActivated).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Отменить изменение' }))
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG)
    expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Отменить изменение' })).toBeDisabled()
  })

  it('clears the preset highlight after a custom edit and restores it through undo', async () => {
    const user = userEvent.setup()
    const preset = PRESETS[2]
    render(
      <>
        <Presets />
        <Swatches />
        <Toolbar />
      </>,
    )
    await user.click(screen.getByRole('button', { name: preset.name }))
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Цвет' })).getByRole('radio', {
        name: 'Бордовый',
      }),
    )
    expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(useConfigStore.getState().config.body.color).toBe('red')
    expect(useConfigStore.getState().config.sole).toEqual(preset.config.sole)

    await user.click(screen.getByRole('button', { name: 'Отменить изменение' }))
    expect(screen.getByRole('button', { name: preset.name })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(useConfigStore.getState().config).toEqual(preset.config)
  })
})

describe('desktop comparison controls', () => {
  it('protects saved A while previewing and returns to the complete B configuration', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Presets />
        <ComparisonControls />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Показать A' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Запомнить A' }))
    expect(screen.getByRole('button', { name: 'Обновить A' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: PRESETS[1].name }))
    await user.click(screen.getByRole('button', { name: 'Показать A' }))
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG)
    expect(screen.getByRole('button', { name: 'Вернуться к B' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Обновить A' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Обновить A' }))
    expect(useConfigStore.getState().comparisonSnapshot).toEqual(DEFAULT_CONFIG)

    await user.click(screen.getByRole('button', { name: 'Вернуться к B' }))
    expect(useConfigStore.getState().config).toEqual(PRESETS[1].config)
    expect(screen.getByRole('button', { name: 'Показать A' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Обновить A' })).toBeEnabled()
  })

  it('leaves A preview when editing and can compare the new B without overwriting A', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Presets />
        <ComparisonControls />
        <Swatches />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Запомнить A' }))
    await user.click(screen.getByRole('button', { name: PRESETS[1].name }))
    await user.click(screen.getByRole('button', { name: 'Показать A' }))
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Цвет' })).getByRole('radio', {
        name: 'Бордовый',
      }),
    )
    expect(useConfigStore.getState().isComparing).toBe(false)
    expect(useConfigStore.getState().config.body.color).toBe('red')
    expect(useConfigStore.getState().comparisonSnapshot).toEqual(DEFAULT_CONFIG)
    expect(screen.getByRole('button', { name: 'Обновить A' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Показать A' }))
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG)
    await user.click(screen.getByRole('button', { name: 'Вернуться к B' }))
    expect(useConfigStore.getState().config.body.color).toBe('red')
    expect(useConfigStore.getState().config.sole).toEqual(DEFAULT_CONFIG.sole)
  })
})

describe('desktop export options', () => {
  it('selects resolution by keyboard and prevents changes while an export is busy', async () => {
    const user = userEvent.setup()
    render(<ExportOptions />)
    const group = screen.getByRole('radiogroup', { name: 'Разрешение PNG' })
    const viewport = within(group).getByRole('radio', { name: 'Экран' })
    const highResolution = within(group).getByRole('radio', { name: '2048 px' })
    expect(viewport).toHaveAttribute('aria-checked', 'true')
    expect(viewport).toHaveAttribute('tabindex', '0')
    expect(highResolution).toHaveAttribute('tabindex', '-1')

    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(highResolution).toHaveFocus()
    expect(highResolution).toHaveAttribute('aria-checked', 'true')
    expect(useUiStore.getState().screenshotSize).toBe('2048')
    act(() => useUiStore.getState().setScreenshotBusy(true))
    expect(viewport).toBeDisabled()
    expect(highResolution).toBeDisabled()
    await user.click(viewport)
    expect(useUiStore.getState().screenshotSize).toBe('2048')

    act(() => useUiStore.getState().setScreenshotBusy(false))
    await user.click(viewport)
    expect(useUiStore.getState().screenshotSize).toBe('viewport')
    expect(viewport).toHaveAttribute('aria-checked', 'true')
  })
})

describe('desktop camera views', () => {
  it('requests a named view and clears its pressed state after manual movement', async () => {
    const user = userEvent.setup()
    render(<CameraViews />)
    const group = screen.getByRole('group', { name: 'Ракурс камеры' })
    expect(within(group).getAllByRole('button')).toHaveLength(3)
    const side = CAMERA_VIEWS.find((view) => view.id === 'side')
    if (!side) throw new Error('The side camera view must be configured.')
    const sideButton = within(group).getByRole('button', { name: side.label })
    const initialRevision = useUiStore.getState().viewRevision

    await user.click(sideButton)
    expect(useUiStore.getState().cameraView).toBe('side')
    expect(useUiStore.getState().viewRevision).toBe(initialRevision + 1)
    expect(useUiStore.getState().sceneActivated).toBe(true)
    expect(sideButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(group).getAllByRole('button', { pressed: true })).toHaveLength(1)

    act(() => useUiStore.getState().clearCameraView())
    expect(useUiStore.getState().cameraView).toBeNull()
    expect(useUiStore.getState().viewRevision).toBe(initialRevision + 1)
    expect(within(group).queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(useConfigStore.getState().config).toEqual(DEFAULT_CONFIG)
  })
})
