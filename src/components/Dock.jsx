import { motion } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { useStore } from '../store.js'
import Timeline from './Timeline.jsx'
import { AnimatedNumber } from './ui/primitives.jsx'
import { dayName, dayOf } from '../lib/week.js'
import { fmtK, pct } from '../lib/format.js'
import { segmentLabel } from '../model/realData.js'

const SPEEDS = [{ v: 0.25, l: '½×' }, { v: 0.5, l: '1×' }, { v: 1.2, l: '2×' }]

export function PeriodSelect({ className = 'period-select', id = 'period' }) {
  const periods = useStore((s) => s.periods)
  const period = useStore((s) => s.period)
  const setPeriod = useStore((s) => s.setPeriod)
  const dataState = useStore((s) => s.dataState)
  if (!periods.length || dataState === 'csv') return null
  const groups = [
    ['Resumen', periods.filter((p) => p.kind !== 'month')],
    ...[...new Set(periods.filter((p) => p.kind === 'month').map((p) => p.id.slice(0, 4)))].map((y) => [y, periods.filter((p) => p.kind === 'month' && p.id.startsWith(y))]),
  ]
  return (
    <>
      <label className="sr-only" htmlFor={id}>Periodo de los datos</label>
      <select id={id} className={className} value={period} onChange={(e) => setPeriod(e.target.value)} title="Periodo: media de cada día laborable">
        {groups.map(([g, list]) => (
          <optgroup key={g} label={g}>
            {list.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </optgroup>
        ))}
      </select>
    </>
  )
}

function Clock() {
  const t = useStore((s) => Math.round(s.t))
  const ds = useStore((s) => s.dataset)
  const dataState = useStore((s) => s.dataState)
  const segment = useStore((s) => s.segment)
  const d = dayOf(t)
  const n = ds.source.nDays?.[d]
  return (
    <div className="clock" aria-live="off">
      <div className="day">{dayName(t)}</div>
      <PeriodSelect />
      <div className="meta">
        {dataState === 'loading' && <><span className="loading-dot" /> Cargando datos…</>}
        {dataState === 'ok' && <>{n ? `Media de ${n} ${DAYS_PL[d]}` : ''}{segment !== 'all' ? ` · ${segmentLabel(segment)}` : ''}</>}
        {dataState === 'error' && 'Datos simulados'}
        {dataState === 'csv' && ds.source.label}
      </div>
    </div>
  )
}
const DAYS_PL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']

function Kpis() {
  const d = useStore((s) => dayOf(s.t))
  const ds = useStore((s) => s.dataset)
  let st = 0
  let dep = 0
  for (let i = 0; i < 73; i++) { st += ds.STAY[d][i]; dep += ds.DEP[d][i] }
  return (
    <>
      <div className="mini-kpi">
        <AnimatedNumber className="v" value={ds.MOV[d]} format={fmtK} />
        <span className="l">viajes entre barrios ese día</span>
      </div>
      {ds.hasStays && (
        <div className="mini-kpi extra">
          <AnimatedNumber className="v" value={dep ? st / dep : 0} format={(v) => pct(v)} />
          <span className="l">de los viajes no salen del barrio</span>
        </div>
      )}
    </>
  )
}

export default function Dock() {
  const playing = useStore((s) => s.playing)
  const togglePlay = useStore((s) => s.togglePlay)
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  return (
    <motion.div className="dock glass" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 22, delay: 0.15 }}>
      <div className="dock-left">
        <button className="play-btn" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir la semana'} title="Reproducir / pausar (espacio)">
          {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <div className="speed" role="radiogroup" aria-label="Velocidad">
          {SPEEDS.map((o) => <button key={o.v} role="radio" aria-checked={speed === o.v} aria-pressed={speed === o.v} onClick={() => setSpeed(o.v)}>{o.l}</button>)}
        </div>
        <Clock />
      </div>
      <Timeline />
      <div className="dock-right"><Kpis /></div>
    </motion.div>
  )
}
