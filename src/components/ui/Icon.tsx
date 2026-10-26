type IconName =
  | 'arrow'
  | 'share'
  | 'download'
  | 'undo'
  | 'redo'
  | 'close'
  | 'rotate'
  | 'check'
  | 'cube'
  | 'side'
  | 'top'
const paths: Record<IconName, string> = {
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  share: 'M6 18 18 6M6 6h12v12',
  download: 'M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4',
  undo: 'M8 5 3 10l5 5M3 10h11a6 6 0 0 1 0 12',
  redo: 'm16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12',
  close: 'm6 6 12 12M6 18 18 6',
  rotate: 'M5 8h-3V5m0 3a10 10 0 1 1-.1 8M12 6v6l4 2',
  check: 'm5 12 4 4L19 6',
  cube: 'm12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7m9 5v10M7.5 4.5l9 5',
  side: 'M3 15c3 0 6-1 8-5l3 2 6 2 1 3v2H3v-4Zm0 2h18M10 12l3 2',
  top: 'M9 3c-3 3-4 8-4 13 0 4 3 6 7 6s7-2 7-6c0-5-1-10-4-13H9Zm0 5h6m-7 4h8m-7 4h6',
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
