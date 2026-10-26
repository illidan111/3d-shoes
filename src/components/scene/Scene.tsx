import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  PerformanceMonitor,
  Stats,
  useEnvironment,
  useGLTF,
} from '@react-three/drei'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import {
  ENVIRONMENT_URL,
  MOBILE_ENVIRONMENT_URL,
  FLOOR_Y,
  MODEL_URL,
  SCENE_BACKGROUND,
} from '../../config/model'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useUiStore } from '../../stores/uiStore'
import { CameraRig } from './CameraRig'
import { Loader } from './Loader'
import { Model } from './Model'
import { SceneRuntime } from './SceneRuntime'

interface BoundaryProps {
  children: ReactNode
  onRetry: () => void
}

class SceneBoundary extends Component<
  BoundaryProps,
  { failed: boolean; webglUnavailable: boolean }
> {
  state = { failed: false, webglUnavailable: false }

  static getDerivedStateFromError(error: Error) {
    return {
      failed: true,
      // A missing GLB is a retryable asset error, not a WebGL capability error.
      webglUnavailable: /Error creating WebGL2? context|WebGL2? is not supported/i.test(
        error.message,
      ),
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The 3D scene could not load:', error, info.componentStack)
    useUiStore.getState().setSceneReady(false)
    useUiStore.getState().announce('Не удалось загрузить 3D-модель. Доступна повторная загрузка.')
  }

  render() {
    if (this.state.webglUnavailable)
      return <StaticFallback lost={false} onRetry={this.props.onRetry} />
    if (this.state.failed) {
      return (
        <div className="scene-error" role="alert">
          <span aria-hidden="true">↻</span>
          <h2>Студия не загрузилась</h2>
          <p>Проверьте соединение и попробуйте снова. Ваша конфигурация сохранена в ссылке.</p>
          <button type="button" onClick={this.props.onRetry}>
            Повторить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function supportsWebGL() {
  // Do not create an expensive throwaway GPU context just to probe support.
  // A renderer creation failure is caught separately by SceneBoundary.
  return typeof WebGL2RenderingContext !== 'undefined'
}

function StaticFallback({ lost, onRetry }: { lost: boolean; onRetry: () => void }) {
  return (
    <div className="scene-fallback">
      <img src="/shoe-fallback.png" alt="Кроссовок FORMA в цвете ледяной синий, вид сбоку" />
      <div role="status">
        <h2>{lost ? 'Восстановим студию?' : '3D недоступно в этом браузере'}</h2>
        <p>
          {lost
            ? 'Графический контекст был прерван. Ваша конфигурация на месте.'
            : 'Вы всё ещё можете выбрать цвета и поделиться конфигурацией. Для 3D включите аппаратное ускорение.'}
        </p>
        {lost && (
          <button type="button" onClick={onRetry}>
            Восстановить 3D
          </button>
        )}
      </div>
    </div>
  )
}

export default function Scene() {
  const [webgl] = useState(supportsWebGL)
  const [attempt, setAttempt] = useState(0)
  const [contextLost, setContextLost] = useState(false)
  const [compact] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')
  const ready = useUiStore((state) => state.sceneReady)
  const quality = useUiStore((state) => state.quality)
  const reducedMotion = useReducedMotion()
  const debug = new URLSearchParams(window.location.search).get('debug') === '1'
  const environmentUrl = compact ? MOBILE_ENVIRONMENT_URL : ENVIRONMENT_URL

  const retry = useCallback(() => {
    // Suspense caches rejected promises too: remounting alone cannot retry.
    useGLTF.clear(MODEL_URL)
    useEnvironment.clear({ files: environmentUrl })
    useUiStore.getState().setSceneReady(false)
    setContextLost(false)
    setAttempt((value) => value + 1)
  }, [environmentUrl])
  const handleContextLost = useCallback(() => setContextLost(true), [])
  const reduceQuality = useCallback(() => {
    if (document.visibilityState === 'visible') useUiStore.getState().setQuality('low')
  }, [])

  useEffect(() => {
    const updateVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  if (!webgl || contextLost) return <StaticFallback lost={contextLost} onRetry={retry} />

  return (
    <div className="scene-shell" data-ready={ready}>
      <SceneBoundary key={attempt} onRetry={retry}>
        <Canvas
          className="scene-canvas"
          role="img"
          aria-label="Интерактивная 3D-модель кроссовка. Перетаскивайте для вращения, используйте колесо для приближения. Детали также доступны в панели."
          camera={{ position: [-2.56, 1.79, 5.13], fov: 32, near: 0.1, far: 60 }}
          dpr={quality === 'high' ? [1, compact ? 1.5 : 2] : 1}
          frameloop={ready && visible ? 'always' : 'never'}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
          }}
          style={{
            opacity: ready ? 1 : 0,
            transition: reducedMotion ? 'none' : 'opacity 550ms ease',
            touchAction: 'pan-y',
          }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 0.85
            gl.outputColorSpace = SRGBColorSpace
            // Transparent offscreen clears are essential for ContactShadows.
            // The attached scene.background below keeps the final PNG opaque.
            gl.setClearColor(SCENE_BACKGROUND, 0)
          }}
          fallback="Интерактивная модель кроссовка. Выбор деталей доступен в панели."
        >
          <Suspense fallback={null}>
            <color attach="background" args={[SCENE_BACKGROUND]} />
            <Environment files={environmentUrl} environmentIntensity={0.65} />
            <ambientLight intensity={0.18} />
            <directionalLight position={[-3, 6, 5]} intensity={1.3} color="#fff9ef" />
            <directionalLight position={[3, 2, -4]} intensity={0.7} color="#deebff" />
            <Model />
            <ContactShadows
              key={quality}
              position={[0, FLOOR_Y - 0.015, 0]}
              opacity={0.35}
              scale={8}
              blur={2.8}
              far={3}
              resolution={quality === 'high' && !compact ? 1024 : 512}
              frames={1}
              color="#323a3a"
            />
            <CameraRig />
            <SceneRuntime onContextLost={handleContextLost} />
            {visible && (
              <PerformanceMonitor
                onDecline={reduceQuality}
                bounds={() => [40, 58]}
                iterations={5}
                ms={500}
              />
            )}
            {debug && <Stats className="scene-stats" />}
          </Suspense>
        </Canvas>
        <Loader />
      </SceneBoundary>
    </div>
  )
}
