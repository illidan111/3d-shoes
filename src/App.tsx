import { useConfigSync } from './hooks/useConfigSync'
import { Panel } from './components/ui/Panel'
import { Toolbar } from './components/ui/Toolbar'
import { HelpDialog } from './components/ui/HelpDialog'
import { Announcement } from './components/ui/Announcement'
import { SceneViewport } from './components/ui/SceneViewport'
import { PerformanceReadout } from './components/ui/PerformanceReadout'
import { Presets } from './components/ui/Presets'
import { ComparisonControls } from './components/ui/ComparisonControls'
import { CameraViews } from './components/ui/CameraViews'

export default function App() {
  useConfigSync()
  return (
    <>
      <a className="skip-link" href="#panel-title">
        Перейти к настройкам
      </a>
      <header className="site-header">
        <a
          href={window.location.pathname}
          className="wordmark"
          aria-label="FORMA Studio — начать заново"
        >
          <strong>FORMA</strong>
          <span> / STUDIO</span>
        </a>
        <span className="header-title">Конфигуратор</span>
        <HelpDialog />
      </header>
      <main className="workspace">
        <section className="stage" aria-label="Предпросмотр кроссовка">
          <div className="stage-heading">
            <h1>
              Твоя форма.
              <br />
              Твои правила.
            </h1>
            <p>Один силуэт. Бесконечно твой.</p>
          </div>
          <Presets />
          <div className="canvas-region">
            <SceneViewport />
          </div>
          <div className="stage-bottom">
            <ComparisonControls />
            <div className="camera-tools">
              <Toolbar />
              <CameraViews />
            </div>
            <div className="orbit-hint">
              <svg
                width="32"
                height="30"
                viewBox="0 0 32 30"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <rect x="11" y="2" width="12" height="25" rx="6" />
                <path d="M17 2v8M7 15H1m0 0 3-3m-3 3 3 3m22-3h5m0 0-3-3m3 3-3 3" />
              </svg>
              <span>Вращай, чтобы рассмотреть</span>
            </div>
          </div>
          <Announcement />
          {new URLSearchParams(window.location.search).get('debug') === '1' && (
            <PerformanceReadout />
          )}
        </section>
        <Panel />
      </main>
    </>
  )
}
