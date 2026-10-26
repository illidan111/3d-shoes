import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PerspectiveCamera, Scene } from 'three'
import { CameraRig } from '../components/scene/CameraRig'
import { CameraViews } from '../components/ui/CameraViews'
import { PartList } from '../components/ui/PartList'
import { useConfigStore } from '../stores/configStore'
import { useUiStore } from '../stores/uiStore'

const harness = vi.hoisted(() => ({ state: vi.fn() }))
vi.mock('@react-three/fiber', () => ({ useThree: () => harness.state(), useFrame: vi.fn() }))
vi.mock('../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@react-three/drei', async () => {
  const React = await import('react')
  const { Vector3 } = await import('three')
  return {
    OrbitControls: React.forwardRef(function MockOrbitControls(_props, ref) {
      const controls = React.useMemo(
        () => ({ target: new Vector3(), maxDistance: 9.6, update: vi.fn() }),
        [],
      )
      React.useImperativeHandle(ref, () => controls, [controls])
      return null
    }),
  }
})

let camera: PerspectiveCamera
beforeEach(() => {
  useConfigStore.setState(useConfigStore.getInitialState(), true)
  useUiStore.setState({ ...useUiStore.getInitialState(), sceneActivated: false }, true)
  camera = new PerspectiveCamera(32, 1.6, 0.1, 60)
  harness.state.mockReturnValue({
    camera,
    scene: new Scene(),
    size: { width: 800, height: 500 },
    gl: { domElement: document.createElement('canvas') },
  })
})
afterEach(() => {
  cleanup()
  useConfigStore.setState(useConfigStore.getInitialState(), true)
  useUiStore.setState(useUiStore.getInitialState(), true)
})

function Studio({ loaded = false }: { loaded?: boolean }) {
  return (
    <>
      <PartList />
      <CameraViews />
      {loaded && <CameraRig />}
    </>
  )
}

describe('camera intent while a model is loading', () => {
  it('honors a named view requested after selecting a part', async () => {
    const user = userEvent.setup()
    const studio = render(<Studio />)
    await user.click(screen.getByRole('radio', { name: /Подошва/ }))
    expect(useUiStore.getState().cameraView).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Сверху' }))
    studio.rerender(<Studio loaded />)
    expect(useConfigStore.getState().selectedPart).toBe('sole')
    expect(useUiStore.getState().cameraView).toBe('top')
    expect(camera.position.y).toBeGreaterThan(3)
    expect(Math.abs(camera.position.z)).toBeLessThan(0.5)
  })

  it('honors a part selected after a named view', async () => {
    const user = userEvent.setup()
    const studio = render(<Studio />)
    await user.click(screen.getByRole('button', { name: 'Сверху' }))
    await user.click(screen.getByRole('radio', { name: /Подошва/ }))
    studio.rerender(<Studio loaded />)
    expect(useUiStore.getState().cameraView).toBeNull()
    expect(camera.position.y).toBeLessThan(2)
    expect(camera.position.z).toBeGreaterThan(3)
  })

  it('keeps a named view when the already selected part is clicked', async () => {
    const user = userEvent.setup()
    const studio = render(<Studio />)
    await user.click(screen.getByRole('button', { name: 'Сверху' }))
    await user.click(screen.getByRole('radio', { name: /Корпус/ }))
    studio.rerender(<Studio loaded />)
    expect(useUiStore.getState().cameraView).toBe('top')
    expect(camera.position.y).toBeGreaterThan(3)
  })
})
