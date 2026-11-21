import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { fmtK } from '../../lib/format.js'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Average weekday arrivals to one barrio, month by month, for the whole series.
// Months inside the current period are highlighted; clicking a month loads it.
export default function Evolution({ summary, i, segment, period, onPick, width = 380, height = 140 }) {
  const [hv, setHv] = useState(-1)
  const data = useMemo(() => {
    const months = summary.periods.filter((p) => p.kind === 'month')
    const names = segment === 'all' ? summary.segments : [segment]
    const vals = months.map((p) => names.reduce((a, n) => a + (summary.arr[p.id]?.[n]?.[i] || 0), 0))
    return { months, vals }
  }, [summary, i, segment])
  const { months, vals } = data
  if (!months.length) return null
  const m = { l: 6, r: 6, t: 16, b: 22 }
  const max = Math.max(...vals) || 1
  const min = Math.min(...vals)
  const lo = Math.max(0, min - (max - min) * 0.25)
  const X = (k) => m.l + (k / (months.length - 1)) * (width - m.l - m.r)
  const Y = (v) => height - m.b - ((v - lo) / (max - lo || 1)) * (height - m.t - m.b)
  const line = vals.map((v, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const area = `${line}L${X(months.length - 1)},${height - m.b}L${X(0)},${height - m.b}Z`
  const inPeriod = (id) => period === id || (period.length === 4 && id.startsWith(period))
  const years = [...new Set(months.map((p) => p.id.slice(0, 4)))]
  const peak = vals.indexOf(max)
  const low = vals.indexOf(min)
  const step = (width - m.l - m.r) / (months.length - 1)

  return (
    <div className="evo">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`Llegadas medias por día laborable, de ${months[0].label} a ${months[months.length - 1].label}. Máximo en ${months[peak].label}, mínimo en ${months[low].label}.`} onPointerLeave={() => setHv(-1)}>
        <g className="axis">
          {years.map((y) => {
            const k = months.findIndex((p) => p.id.startsWith(y))
            return (
              <g key={y}>
                {k > 0 && <line x1={X(k) - step / 2} x2={X(k) - step / 2} y1={m.t - 6} y2={height - m.b + 4} />}
                <text x={X(k) - (k > 0 ? step / 2 : 0) + 4} y={height - 6}>{y}</text>
              </g>
            )
          })}
        </g>
        {months.map((p, k) => inPeriod(p.id) && (
          <rect key={p.id} x={X(k) - step / 2} y={m.t - 6} width={step} height={height - m.t - m.b + 6} fill="var(--accent)" opacity="0.22" />
        ))}
        <path d={area} fill="var(--ink)" opacity="0.06" />
        <motion.path d={line} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} key={`${i}-${segment}`} />
        {[peak, low].map((k) => <circle key={k} cx={X(k)} cy={Y(vals[k])} r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />)}
        {hv >= 0 && <circle cx={X(hv)} cy={Y(vals[hv])} r="5" fill="var(--accent)" stroke="var(--ink)" strokeWidth="2" />}
        {months.map((p, k) => (
          <rect key={`h${p.id}`} className="hit" x={X(k) - step / 2} y={0} width={step} height={height} fill="transparent" onPointerEnter={() => setHv(k)} onClick={() => onPick?.(p.id)}>
            <title>{`${p.label}: ${fmtK(vals[k])} llegadas por día laborable`}</title>
          </rect>
        ))}
      </svg>
      {hv >= 0 && (
        <span className="evo-tip" style={{ left: `${(X(hv) / width) * 100}%` }}>
          {MONTHS[Number(months[hv].id.slice(5)) - 1]} {months[hv].id.slice(2, 4)} · {fmtK(vals[hv])}
        </span>
      )}
    </div>
  )
}
