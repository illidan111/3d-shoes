import { lazy, Suspense } from 'react'
import { useUiStore } from '../../stores/uiStore'
import { AppErrorBoundary } from './AppErrorBoundary'
import { Icon } from './Icon'

const Scene = lazy(() => import('../scene/Scene'))

export function SceneViewport() {
  const activated = useUiStore((state) => state.sceneActivated)
  const activate = useUiStore((state) => state.activateScene)
  if (!activated)
    return (
      <button
        type="button"
        className="scene-activation"
        onClick={activate}
        aria-label="Открыть 3D-модель кроссовка"
      >
        <img
          src="/shoe-fallback.png"
          alt="Кроссовок FORMA в стандартной конфигурации"
          width="1025"
          height="646"
          fetchPriority="high"
        />
        <span>
          Открыть 3D <Icon name="rotate" size={17} />
        </span>
      </button>
    )
  return (
    <AppErrorBoundary>
      <Suspense
        fallback={
          <div className="scene-loader" role="status">
            <span className="loader-ring" />
            <p>Открываем студию…</p>
          </div>
        }
      >
        <Scene />
      </Suspense>
    </AppErrorBoundary>
  )
}
