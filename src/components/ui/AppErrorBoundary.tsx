import { Component } from 'react'
import type { ReactNode } from 'react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="scene-error" role="alert">
          <h2>Студия не загрузилась</h2>
          <p>Проверь соединение и попробуй ещё раз.</p>
          <button className="secondary-button" onClick={() => window.location.reload()}>
            Повторить
          </button>
        </div>
      )
    return this.props.children
  }
}
