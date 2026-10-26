import { useUiStore } from '../../stores/uiStore'

export function Announcement() {
  const notice = useUiStore((state) => state.notice)
  const revision = useUiStore((state) => state.noticeRevision)
  return (
    <p
      className={`announcement ${notice ? 'is-visible' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span key={revision}>{notice}</span>
    </p>
  )
}
