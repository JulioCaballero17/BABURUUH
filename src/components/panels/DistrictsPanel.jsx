import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { chord as d3chord, ribbon as d3ribbon, arc as d3arc, descending } from 'd3'
import { useStore } from '../../store.js'
import { districtMatrix } from '../../model/derive.js'
import { DISTRICTS, DISTRICT_SHORT } from '../../data/attributes.js'
import { DISTRICT_COLORS } from '../../lib/colors.js'
import { fmt, fmtK, pct } from '../../lib/format.js'
import { clockText, dayName } from '../../lib/week.js'

const SIZE = 320
const R = SIZE / 2 - 30
const IR = R - 12

export default function DistrictsPanel() {
  const ds = useStore((s) => s.dataset)
  const th = useStore((s) => Math.floor(s.t))
  const [focus, setFocus] = useState(-1)

  const { chords, M, inner, total, pairs } = useMemo(() => {
    const full = districtMatrix(ds, th)
    let inner = 0
    let total = 0
    const M = full.map((row, a) => row.map((v, b) => { total += v; if (a === b) { inner += v; return 0 } return v }))
    const chords = d3chord().padAngle(0.035).sortSubgroups(descending)(M)
    const pairs = []
    M.forEach((row, a) => row.forEach((v, b) => { if (v > 0) pairs.push({ a, b, v }) }))
    pairs.sort((x, y) => y.v - x.v)
    return { chords, M, inner, total, pairs: pairs.slice(0, 6) }
  }, [ds, th])

  const arc = d3arc().innerRadius(IR).outerRadius(R)
  const ribbon = d3ribbon().radius(IR - 1)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="serif" style={{ fontSize: 22, fontStyle: 'italic' }}>{dayName(th)}, {clockText(th)}</span>
        <span className="note">{fmtK(total - inner)} personas/h entre distritos</span>
      </div>
      <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} width="100%" role="img" aria-label="Diagrama de cuerdas de los flujos entre distritos" onPointerLeave={() => setFocus(-1)}>
        {chords.map((c, k) => {
          const on = focus < 0 || c.source.index === focus || c.target.index === focus
          return (
            <motion.path
              key={`${c.source.index}-${c.target.index}`}
              initial={false}
              animate={{ d: ribbon(c), opacity: on ? 0.72 : 0.06 }}
              transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              fill={DISTRICT_COLORS[c.source.index + 1]}
              stroke="var(--glass-solid)"
              strokeWidth="0.5"
            >
              <title>{`${DISTRICTS[c.source.index + 1]} → ${DISTRICTS[c.target.index + 1]}: ${fmt(c.source.value)} · ${DISTRICTS[c.target.index + 1]} → ${DISTRICTS[c.source.index + 1]}: ${fmt(c.target.value)}`}</title>
            </motion.path>
          )
        })}
        {chords.groups.map((g) => {
          const a = (g.startAngle + g.endAngle) / 2
          const flip = a > Math.PI
          return (
            <g key={g.index} onPointerEnter={() => setFocus(g.index)} style={{ cursor: 'pointer' }}>
              <motion.path initial={false} animate={{ d: arc(g) }} transition={{ type: 'spring', stiffness: 90, damping: 18 }} fill={DISTRICT_COLORS[g.index + 1]} />
              <text
                transform={`rotate(${(a * 180) / Math.PI - 90}) translate(${R + 6}) ${flip ? 'rotate(180)' : ''}`}
                textAnchor={flip ? 'end' : 'start'}
                dy="0.35em"
                style={{ fontSize: 9.5, fill: focus === g.index ? 'var(--ink)' : 'var(--ink-2)', fontWeight: focus === g.index ? 700 : 500 }}
              >{DISTRICT_SHORT[g.index + 1]}</text>
            </g>
          )
        })}
      </svg>
      <section>
        <div className="section-title"><h3>{focus >= 0 ? DISTRICTS[focus + 1] : 'Conexiones más fuertes'}</h3><span>personas/h</span></div>
        <div className="bars">
          {(focus >= 0
            ? M[focus].map((v, b) => ({ a: focus, b, v })).filter((o) => o.v > 0).sort((x, y) => y.v - x.v).slice(0, 6)
            : pairs
          ).map((p, k, arr) => (
            <div key={`${p.a}-${p.b}`} className="bar-row" style={{ cursor: 'default' }}>
              <span className="n">{DISTRICT_SHORT[p.a + 1]} → {DISTRICT_SHORT[p.b + 1]}</span>
              <span className="v">{fmt(p.v)}</span>
              <span className="track"><motion.i style={{ background: DISTRICT_COLORS[p.a + 1] }} initial={false} animate={{ width: `${(p.v / arr[0].v) * 100}%` }} /></span>
            </div>
          ))}
        </div>
      </section>
      <p className="note">Pasa el cursor por un distrito para aislar sus flujos. Los viajes dentro de un mismo distrito ({pct(total ? inner / total : 0)} del total a esta hora) no se dibujan.</p>
    </>
  )
}
