import { useEffect, useState } from 'react'

/** Only mounted with ?debug=1; one update per second, never per render frame. */
export function PerformanceReadout() {
  const [metrics, setMetrics] = useState('Измеряем производительность…')
  useEffect(() => {
    const receive = (event: Event) => {
      if (!(event instanceof CustomEvent)) return
      const data: unknown = event.detail
      if (!data || typeof data !== 'object') return
      const keys = ['fps', 'calls', 'triangles', 'geometries', 'textures', 'dpr'] as const
      if (!keys.every((key) => typeof Reflect.get(data, key) === 'number')) return
      setMetrics(keys.map((key) => `${key}: ${String(Reflect.get(data, key))}`).join(' · '))
    }
    window.addEventListener('forma:metrics', receive)
    return () => window.removeEventListener('forma:metrics', receive)
  }, [])
  return (
    <output className="performance-readout" aria-label="Метрики рендера">
      {metrics}
    </output>
  )
}
