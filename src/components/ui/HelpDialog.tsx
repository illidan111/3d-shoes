import { useRef } from 'react'
import { Icon } from './Icon'

export function HelpDialog() {
  const dialog = useRef<HTMLDialogElement>(null)
  return (
    <>
      <button type="button" className="help-button" onClick={() => dialog.current?.showModal()}>
        Как это работает <Icon name="share" size={16} />
      </button>
      <dialog ref={dialog} className="dialog help-dialog" aria-labelledby="help-title">
        <div className="dialog-heading">
          <h2 id="help-title">Твоя пара за минуту</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Закрыть инструкцию"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <ol>
          <li>
            <strong>Рассмотри силуэт.</strong> Перетаскивай модель мышью. Колесо приближает. На
            телефоне вращай горизонтальным жестом, приближай двумя пальцами.
          </li>
          <li>
            <strong>Выбери деталь.</strong> Нажми на модель или на часть в панели. Выбери цвет и
            материал.
          </li>
          <li>
            <strong>Сохрани идею.</strong> Поделись ссылкой на конфигурацию или скачай изображение
            текущего ракурса.
          </li>
        </ol>
        <p className="desktop-feature">
          Готовая палитра меняет всю пару одним шагом. Нажми «Запомнить A», создай другой вариант и
          переключайся между A и B. Снимок A хранится до перезагрузки. Стандартные ракурсы и экспорт
          2048 px помогут сохранить результат.
        </p>
        <p>
          С клавиатуры: Tab переходит между группами, стрелки выбирают вариант. Ctrl / ⌘ Z отменяет
          изменение; Shift + Ctrl / ⌘ Z возвращает его.
        </p>
        <p>
          На телефоне листай страницу вертикально. Системная настройка уменьшения движения отключает
          анимации.
        </p>
        <button type="button" className="primary-button" onClick={() => dialog.current?.close()}>
          Начать создавать <Icon name="arrow" />
        </button>
      </dialog>
    </>
  )
}
