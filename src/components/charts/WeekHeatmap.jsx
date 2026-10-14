import { DAYS, RAMP_ACTIVITY, rampAt, rgbStr } from '../../lib/colors.js'

// 5 days × 24 hours of arrivals for one barrio. Click a cell to jump the whole app there.
export default function WeekHeatmap({ series, current, onPick, label }) {
  const max = Math.max(...series) || 1
  const cw = 13.4
  const ch = 15
  const left = 22
  const top = 4
  return (
    <svg viewBox={`0 0 ${left + 24 * cw + 2} ${top + 5 * ch + 16}`} width="100%" role="img" aria-label={label}>
      {DAYS.map((d, k) => (
        <text key={d.key} x={left - 8} y={top + k * ch + ch / 2 + 4} textAnchor="end" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, fill: d.hue }}>{d.key}</text>
      ))}
      {series.map((v, t) => {
        const d = Math.floor(t / 24)
        const h = t % 24
        const x = Math.pow(v / max, 0.75)
        return (
          <rect
            key={t}
            className="heat-cell"
            x={left + h * cw + 0.5}
            y={top + d * ch + 0.5}
            width={cw - 1.5}
            height={ch - 1.5}
            rx="2.5"
            fill={rgbStr(rampAt(RAMP_ACTIVITY, x))}
            fillOpacity={0.25 + 0.75 * x}
            stroke={t === current ? 'var(--ink)' : 'none'}
            strokeWidth={t === current ? 2 : 0}
            onClick={() => onPick(t)}
          >
            <title>{`${DAYS[d].name} ${String(h).padStart(2, '0')}:00 · ${Math.round(v).toLocaleString('es-ES')} llegadas`}</title>
          </rect>
        )
      })}
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={left + h * cw + cw / 2} y={top + 5 * ch + 12} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--ink-3)' }}>{h}h</text>
      ))}
    </svg>
  )
}
