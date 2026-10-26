import { useProgress } from '@react-three/drei'
import { useUiStore } from '../../stores/uiStore'

export function Loader() {
  const progress = useProgress((state) => state.progress)
  const ready = useUiStore((state) => state.sceneReady)
  if (ready) return null

  return (
    <div className="scene-loader" role="status" aria-live="polite">
      <span className="scene-loader-mark" aria-hidden="true">
        F.
      </span>
      <p>Собираем вашу пару</p>
      <div
        className="scene-progress"
        role="progressbar"
        aria-label="Загрузка 3D-модели и освещения"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ transform: `scaleX(${Math.max(0.04, progress / 100)})` }} />
      </div>
      <small>
        {progress >= 100
          ? 'Подготавливаем свет и материалы…'
          : `${Math.round(progress)}% · загружаем студию`}
      </small>
    </div>
  )
}
