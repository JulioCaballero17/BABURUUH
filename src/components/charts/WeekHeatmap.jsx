import { DAYS, RAMP_ACTIVITY, rampAt, rgbStr } from '../../lib/colors.js'

// Arrivals for one barrio on each weekday (Monday … Friday). Click a day to jump the whole app there.
export default function WeekHeatmap({ series, current, onPick, label }) {
  const max = Math.max(...series) || 1
  const cw = 64
  const ch = 46
  const gap = 6
  return (
    <svg viewBox={`0 0 ${5 * cw + 4 * gap} ${ch + 18}`} width="100%" role="img" aria-label={label}>
      {series.map((v, d) => {
        const x = Math.pow(v / max, 0.75)
        const px = d * (cw + gap)
        return (
          <g key={d} className="heat-cell" style={{ cursor: 'pointer' }} onClick={() => onPick(d)}>
            <rect
              x={px + 0.5}
              y={0.5}
              width={cw - 1}
              height={ch - 1}
              rx="7"
              fill={rgbStr(rampAt(RAMP_ACTIVITY, x))}
              fillOpacity={0.3 + 0.7 * x}
              stroke={d === current ? 'var(--ink)' : 'none'}
              strokeWidth={d === current ? 2 : 0}
            />
            <text x={px + cw / 2} y={ch / 2 + 4} textAnchor="middle" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: x > 0.55 ? '#fff' : 'var(--ink)' }}>
              {v >= 1000 ? `${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: v >= 100000 ? 0 : 1 })} k` : Math.round(v)}
            </text>
            <text x={px + cw / 2} y={ch + 14} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, fill: DAYS[d].hue }}>{DAYS[d].short}</text>
            <title>{`${DAYS[d].name} · ${Math.round(v).toLocaleString('es-ES')} llegadas`}</title>
          </g>
        )
      })}
    </svg>
  )
}
