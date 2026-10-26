import { useRef } from 'react'
import { useConfigStore } from '../../stores/configStore'
import { useUiStore } from '../../stores/uiStore'
import { updateConfigUrl } from '../../lib/urlState'
import { Icon } from './Icon'
import { PartList } from './PartList'
import { Swatches } from './Swatches'

export function Panel() {
  const sceneReady = useUiStore((state) => state.sceneReady)
  const requestScreenshot = useUiStore((state) => state.requestScreenshot)
  const announce = useUiStore((state) => state.announce)
  const shareDialog = useRef<HTMLDialogElement>(null)
  const shareInput = useRef<HTMLInputElement>(null)

  async function share() {
    updateConfigUrl(useConfigStore.getState().config)
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      announce('Ссылка скопирована. Поделись своей парой!')
    } catch {
      if (shareInput.current) shareInput.current.value = url
      shareDialog.current?.showModal()
      shareInput.current?.select()
    }
  }

  return (
    <aside className="config-panel" aria-labelledby="panel-title">
      <div className="panel-header">
        <h2 id="panel-title">Создай свою пару</h2>
        <p>FORM 01 / Персональная конфигурация</p>
      </div>
      <PartList />
      <Swatches />
      <div className="panel-actions">
        <button type="button" className="primary-button" onClick={() => void share()}>
          Поделиться <Icon name="share" />
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!sceneReady}
          onClick={requestScreenshot}
        >
          Скачать PNG <Icon name="download" />
        </button>
        <p className="panel-signature">Сделано тобой. В единственном экземпляре.</p>
      </div>
      <dialog ref={shareDialog} className="dialog" aria-labelledby="share-title">
        <div className="dialog-heading">
          <h2 id="share-title">Твоя конфигурация</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть"
            onClick={() => shareDialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>Скопируй ссылку. Все цвета и материалы уже сохранены в ней.</p>
        <input
          ref={shareInput}
          readOnly
          aria-label="Ссылка на конфигурацию"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className="primary-button"
          onClick={() => shareDialog.current?.close()}
        >
          Готово
        </button>
      </dialog>
    </aside>
  )
}
