import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SceneViewport } from '../components/ui/SceneViewport'
import { shouldStartScene } from '../lib/sceneActivation'
import { useUiStore } from '../stores/uiStore'

const lazyScene = vi.hoisted(() => ({ load: vi.fn() }))

vi.mock('../components/scene/Scene', () => {
  lazyScene.load()
  return { default: () => <div role="img" aria-label="Загруженная 3D-сцена" /> }
})

beforeEach(() => {
  useUiStore.setState({ sceneActivated: false, sceneReady: false })
})

describe('progressive 3D activation', () => {
  it('automatically starts the desktop scene for the default configuration', () => {
    expect(shouldStartScene(false, '')).toBe(true)
  })

  it('keeps the default mobile configuration as a static preview', () => {
    expect(shouldStartScene(true, '')).toBe(false)
    expect(shouldStartScene(true, '?body=blue-matte&tongue=black-matte')).toBe(false)
  })

  it('ignores invalid configuration and unrelated parameters on mobile', () => {
    expect(shouldStartScene(true, '?body=invalid-metallic&sole=red-missing')).toBe(false)
    expect(shouldStartScene(true, '?campaign=launch&debug=1&unknown=red-matte')).toBe(false)
  })

  it('starts a customized share link immediately on mobile', () => {
    expect(shouldStartScene(true, '?body=red-metallic')).toBe(true)
    expect(shouldStartScene(true, '?tongue=rose-glossy&campaign=shared')).toBe(true)
  })

  it('honors a valid customization even if another part is invalid', () => {
    expect(shouldStartScene(true, '?body=invalid-matte&lace=navy-glossy')).toBe(true)
  })

  it('does not import the mobile scene until the user activates it', async () => {
    const user = userEvent.setup()
    render(<SceneViewport />)
    expect(
      screen.getByRole('img', { name: 'Кроссовок FORMA в стандартной конфигурации' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Загруженная 3D-сцена' })).not.toBeInTheDocument()
    expect(lazyScene.load).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Открыть 3D-модель кроссовка' }))

    expect(await screen.findByRole('img', { name: 'Загруженная 3D-сцена' })).toBeInTheDocument()
    expect(lazyScene.load).toHaveBeenCalledTimes(1)
    expect(useUiStore.getState().sceneActivated).toBe(true)
    expect(
      screen.queryByRole('button', { name: 'Открыть 3D-модель кроссовка' }),
    ).not.toBeInTheDocument()
  })
})
