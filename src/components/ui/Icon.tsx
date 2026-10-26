type IconName = 'arrow' | 'share' | 'download' | 'undo' | 'redo' | 'close' | 'rotate' | 'check'
const paths: Record<IconName, string> = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  share: 'M6 18 18 6M6 6h12v12',
  download: 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4',
  undo: 'M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12',
  redo: 'm16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12',
  close: 'm6 6 12 12M6 18 18 6',
  rotate: 'M5 8h-3V5m0 3a10 10 0 1 1-.1 8M12 6v6l4 2',
  check: 'm5 12 4 4L19 6',
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
