import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { scaleLinear } from 'd3'
import { BARRIOS } from '../../model/geo.js'
import { DISTRICT_COLORS } from '../../lib/colors.js'

// Restaurants per 1,000 residents (x) vs. share of evening trips that stay in the barrio (y)
export default function Scatter({ xs, ys, reg, sel, hover, onHover, onPick, xLabel, yLabel, width = 336, height = 250 }) {
  const m = { l: 40, r: 12, t: 12, b: 36 }
  const [tip, setTip] = useState(null)
  const x = useMemo(() => scaleLinear().domain([0, Math.max(...xs) * 1.05]).nice().range([m.l, width - m.r]), [xs, width])
  const y = useMemo(() => scaleLinear().domain([0, Math.max(...ys) * 1.1]).nice().range([height - m.b, m.t]), [ys, height])
  const xt = x.ticks(5)
  const yt = y.ticks(5)
  const x0 = x.domain()[0]
  const x1 = x.domain()[1]
  const clampY = (v) => Math.max(y.domain()[0], Math.min(y.domain()[1], v))
  const order = [...xs.keys()].sort((a, b) => (a === sel || a === hover ? 1 : 0) - (b === sel || b === hover ? 1 : 0))

  return (
    <div style={{ position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yLabel} frente a ${xLabel}. Correlación ${reg.r.toFixed(2)}.`}>
        <g className="axis">
          {yt.map((v) => (
            <g key={`y${v}`}>
              <line x1={m.l} x2={width - m.r} y1={y(v)} y2={y(v)} strokeDasharray="2 4" />
              <text x={m.l - 8} y={y(v) + 3} textAnchor="end">{Math.round(v * 100)}%</text>
            </g>
          ))}
          {xt.map((v) => (
            <text key={`x${v}`} x={x(v)} y={height - m.b + 16} textAnchor="middle">{v}</text>
          ))}
          <text x={(m.l + width - m.r) / 2} y={height - 4} textAnchor="middle" style={{ fontFamily: 'var(--font-ui)', fontSize: 11 }}>{xLabel}</text>
        </g>
        <motion.line
          x1={x(x0)} x2={x(x1)}
          animate={{ y1: y(clampY(reg.intercept + reg.slope * x0)), y2: y(clampY(reg.intercept + reg.slope * x1)) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          stroke="var(--ink)" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="5 4"
        />
        {order.map((i) => {
          const on = i === sel || i === hover
          return (
            <motion.circle
              key={i}
              initial={false}
              animate={{ cx: x(xs[i]), cy: y(ys[i]), r: on ? 7 : 4.2 }}
              transition={{ type: 'spring', stiffness: 160, damping: 22 }}
              fill={DISTRICT_COLORS[BARRIOS[i].dist]}
              fillOpacity={sel >= 0 && !on ? 0.45 : 0.9}
              stroke={on ? 'var(--ink)' : 'rgba(0,0,0,0.25)'}
              strokeWidth={on ? 2 : 0.6}
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => { onHover(i); setTip({ i, x: x(xs[i]), y: y(ys[i]) }) }}
              onPointerLeave={() => { onHover(-1); setTip(null) }}
              onClick={() => onPick(i)}
            />
          )
        })}
      </svg>
      {tip && (
        <div className="glass" style={{ position: 'absolute', left: `${(tip.x / width) * 100}%`, top: `${(tip.y / height) * 100}%`, transform: 'translate(-50%, calc(-100% - 12px))', padding: '6px 10px', borderRadius: 10, fontSize: 12, pointerEvents: 'none', whiteSpace: 'nowrap', background: 'var(--glass-strong)' }}>
          <b>{BARRIOS[tip.i].name}</b>
          <div className="num" style={{ color: 'var(--ink-2)' }}>{xs[tip.i].toLocaleString('es-ES')} rest. · {Math.round(ys[tip.i] * 100)} % se queda</div>
        </div>
      )}
    </div>
  )
}
