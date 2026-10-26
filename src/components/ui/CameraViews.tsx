import { CAMERA_VIEWS } from '../../config/views'
import { useUiStore } from '../../stores/uiStore'
import { Icon } from './Icon'

export function CameraViews() {
  const current = useUiStore((state) => state.cameraView)
  const setCameraView = useUiStore((state) => state.setCameraView)
  return (
    <div className="camera-views desktop-feature" role="group" aria-label="Ракурс камеры">
      {CAMERA_VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-pressed={current === view.id}
          onClick={() => {
            setCameraView(view.id)
            useUiStore.getState().announce(`Ракурс: ${view.label.toLowerCase()}.`)
          }}
        >
          <Icon name={view.id === 'three-quarter' ? 'cube' : view.id === 'side' ? 'side' : 'top'} />
          {view.label}
        </button>
      ))}
    </div>
  )
}
