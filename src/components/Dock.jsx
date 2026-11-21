import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause } from 'lucide-react'
import { useStore } from '../store.js'
import { AnimatedNumber } from './ui/primitives.jsx'
import { DAYS } from '../lib/colors.js'
import { dayOf } from '../lib/week.js'
import { fmtK } from '../lib/format.js'
import { SEGMENTS, segmentLabel } from '../model/realData.js'

const SPEEDS = [{ v: 0.25, l: '½×' }, { v: 0.5, l: '1×' }, { v: 1.2, l: '2×' }]
const DAYS_PL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']

export function PeriodSelect({ className = 'select', id = 'period' }) {
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
    <select id={id} className={className} value={period} onChange={(e) => setPeriod(e.target.value)} title="Periodo: media de cada día laborable">
      {groups.map(([g, list]) => (
        <optgroup key={g} label={g}>
          {list.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </optgroup>
      ))}
    </select>
  )
}

export function SegmentSelect({ id = 'segment' }) {
  const segment = useStore((s) => s.segment)
  const setSegment = useStore((s) => s.setSegment)
  const dataState = useStore((s) => s.dataState)
  const csv = useStore((s) => s.csv)
  const options = dataState === 'csv'
    ? (csv?.segments.length > 1 ? [SEGMENTS[0], ...SEGMENTS.filter((s) => csv.segments.includes(s.value))] : null)
    : SEGMENTS
  if (!options) return null
  return (
    <select id={id} className="select" value={segment} onChange={(e) => setSegment(e.target.value)} title="Tipo de viajero">
      {options.map((s) => <option key={s.value} value={s.value}>{s.long}</option>)}
    </select>
  )
}

// The week as a metro line: five stations, the current day is the lit stop.
function MetroLine() {
  const day = useStore((s) => dayOf(s.t))
  const ds = useStore((s) => s.dataset)
  const goDay = useStore((s) => s.goDay)
  const track = useRef(null)
  const head = useRef(null)
  const fill = useRef(null)

  useEffect(() => {
    const place = (t) => {
      const x = `${(Math.max(0, Math.min(4, t)) / 4) * 100}%`
      if (head.current) head.current.style.left = x
      if (fill.current) fill.current.style.width = x
    }
    place(useStore.getState().t)
    return useStore.subscribe((s, p) => { if (s.t !== p.t) place(s.t) })
  }, [])

  const toDay = (e) => {
    const r = track.current.getBoundingClientRect()
    return Math.max(0, Math.min(4, Math.round(((e.clientX - r.left) / r.width) * 4)))
  }
  const dragging = useRef(false)
  const onDown = (e) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    const s = useStore.getState()
    if (s.playing) s.togglePlay()
    goDay(toDay(e))
  }
  const onMove = (e) => {
    if (!dragging.current) return
    const d = toDay(e)
    if (d !== dayOf(useStore.getState().t)) goDay(d)
  }
  const onKey = (e) => {
    const s = useStore.getState()
    if (e.key === 'ArrowRight') { e.preventDefault(); s.stepDay(1) } else if (e.key === 'ArrowLeft') { e.preventDefault(); s.stepDay(-1) } else if (e.key === 'Home') { e.preventDefault(); s.goDay(0) } else if (e.key === 'End') { e.preventDefault(); s.goDay(4) }
  }
  const max = Math.max(...ds.MOV) || 1

  return (
    <div className="metro" data-tour="metro">
      <div
        ref={track}
        className="metro-track"
        role="slider"
        tabIndex={0}
        aria-label="Día de la semana"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={day}
        aria-valuetext={`${DAYS[day].name}: ${fmtK(ds.MOV[day])} viajes entre barrios`}
        onKeyDown={onKey}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => { dragging.current = false }}
      >
        <div className="metro-line" />
        <div className="metro-fill" ref={fill} />
        {DAYS.map((d, k) => (
          <div key={d.key} className="station" style={{ left: `${(k / 4) * 100}%` }} aria-pressed={k === day} title={`${d.name} · tecla ${k + 1}`}>
            <span className="vol" style={{ height: 3 + (ds.MOV[k] / max) * 12 }} />
            <span className="trips">{fmtK(ds.MOV[k])}</span>
            <span className="stop" />
            <span className="name">{d.short}</span>
          </div>
        ))}
        <div className="metro-head" ref={head} />
      </div>
    </div>
  )
}

function Kpi() {
  const d = useStore((s) => dayOf(s.t))
  const ds = useStore((s) => s.dataset)
  const dataState = useStore((s) => s.dataState)
  const segment = useStore((s) => s.segment)
  const n = ds.source.nDays?.[d]
  return (
    <div className="dock-kpi" aria-live="off">
      <AnimatedNumber className="v" value={ds.MOV[d]} format={fmtK} />
      <span className="l">viajes entre barrios un {DAYS_PL[d]} medio</span>
      <span className="meta">
        {dataState === 'loading' && <><span className="dot live" /> Cargando…</>}
        {dataState === 'ok' && <>{n ? `Media de ${n} ${DAYS_PL[d]}` : ''}{segment !== 'all' ? ` · ${segmentLabel(segment).toLowerCase()}` : ''}</>}
        {dataState === 'error' && 'Datos simulados'}
        {dataState === 'csv' && 'Tu CSV'}
      </span>
    </div>
  )
}

export default function Dock() {
  const playing = useStore((s) => s.playing)
  const togglePlay = useStore((s) => s.togglePlay)
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  const dataState = useStore((s) => s.dataState)
  return (
    <motion.div className="dock glass" data-tour="dock" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 24, delay: 0.15 }}>
      <div className="dock-play">
        <button className="play-btn" data-tour="play" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir la semana'} title="Reproducir / pausar (espacio)">
          {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <div className="speed" role="radiogroup" aria-label="Velocidad">
          {SPEEDS.map((o) => <button key={o.v} role="radio" aria-checked={speed === o.v} aria-pressed={speed === o.v} onClick={() => setSpeed(o.v)}>{o.l}</button>)}
        </div>
      </div>
      <MetroLine />
      <div className="dock-data" data-tour="dock-data">
        {dataState === 'csv' ? (
          <label><span>Datos</span><b style={{ fontSize: 12.5 }}>Tu CSV</b></label>
        ) : (
          <label htmlFor="period"><span>Periodo</span><PeriodSelect /></label>
        )}
        <label htmlFor="segment"><span>Viajeros</span><SegmentSelect /></label>
      </div>
      <Kpi />
    </motion.div>
  )
}
