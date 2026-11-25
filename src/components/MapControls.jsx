import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Compass, Box, Orbit, Video, Info, ArrowUpFromLine } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { visitorShares, shareRange } from '../model/derive.js'
import { useStore } from '../store.js'
import { zoomBy, resetNorth, togglePitch, getMap, flyPreset, PRESETS } from '../engine/mapEngine.js'
import { Clapperboard } from 'lucide-react'
import { legendFor } from '../lib/legend.js'
import { BARRIOS } from '../model/geo.js'
import { fmt, fmtK } from '../lib/format.js'
import { PARTICLE_COLORS } from '../engine/particles.js'

export function useLegend() {
  const st = useStore(useShallow((s) => ({
    colorMode: s.colorMode, deltaBase: s.deltaBase, sel: s.sel, influenceDir: s.influenceDir, t: Math.round(s.t) % 5,
    periods: s.periods, period: s.period, comparePeriod: s.comparePeriod, dataState: s.dataState, visitorKind: s.visitorKind, dataset: s.dataset,
  })))
  let visitorRange = null
  if (st.colorMode === 'visitors') {
    const sh = visitorShares(st.dataset, st.t, st.visitorKind)
    if (sh) visitorRange = shareRange(sh, st.dataset, st.t)
  }
  return legendFor({ ...st, visitorRange })
}

const WHO = { Residente: 'Residentes', Regional: 'Resto de Cataluña', Nacional: 'Resto de España', Internacional: 'Extranjero', all: 'Viajes' }

function MetroLegend() {
  const lines = useStore((s) => s.metroLines)
  const focus = useStore((s) => s.metroFocus)
  const setFocus = useStore((s) => s.setMetroFocus)
  return (
    <motion.div className="legend glass metro-legend" data-tour="legend" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <p className="eyebrow" style={{ marginBottom: 6 }}>Plano de la demanda</p>
      <div className="ttl">Si Barcelona trazara su metro solo con estos datos</div>
      <ul className="metro-lines">
        {lines.map((l) => (
          <li key={l.id}>
            <button aria-pressed={focus === l.id} onMouseEnter={() => setFocus(l.id)} onMouseLeave={() => setFocus(-1)} onFocus={() => setFocus(l.id)} onBlur={() => setFocus(-1)}>
              <span className="roundel" style={{ background: l.color, color: l.name === 'L4' ? '#17191C' : '#fff' }}>{l.name}</span>
              <span className="ends-txt">{BARRIOS[l.stations[0]].short} <span aria-hidden="true">↔</span> {BARRIOS[l.stations[l.stations.length - 1]].short}</span>
              <span className="vol">{fmtK(l.load)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="foot"><Info aria-hidden="true" /><span>Las 5 rutas entre barrios vecinos que más viajes acumulan. Cifra: viajes al día por tramo. No es el metro real.</span></div>
    </motion.div>
  )
}

function ParticleLegend() {
  const info = useStore((s) => s.particleInfo)
  if (!info) return null
  return (
    <motion.div className="legend glass" data-tour="legend" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <p className="eyebrow" style={{ marginBottom: 6 }}>Barcelona en movimiento</p>
      <div className="ttl">Cada punto ≈ {fmt(info.perDot)} viajes reales</div>
      <div className="comp-legend" style={{ marginTop: 4 }}>
        {info.segments.map((n) => <span key={n}><i style={{ background: PARTICLE_COLORS[n], borderRadius: '50%' }} />{WHO[n] || n}</span>)}
      </div>
      <div className="foot"><Info aria-hidden="true" /><span>Van de su barrio de origen al de destino. Cambia de día en la línea de metro.</span></div>
    </motion.div>
  )
}

function Legend() {
  const view = useStore((s) => s.view)
  if (view === 'metro') return <MetroLegend />
  if (view === 'flujo') return <ParticleLegend />
  return <MapLegend />
}

function MapLegend() {
  const lg = useLegend()
  const bicing = useStore((s) => s.layers.bicing && s.bicing)
  const barrios = useStore((s) => s.layers.barrios)
  return (
    <motion.div className="legend glass" data-tour="legend" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
      <p className="eyebrow" style={{ marginBottom: 6 }}>Cómo leer el mapa</p>
      <div className="ttl">{lg.title}</div>
      {(lg.min || lg.max) && (
        <>
          <div className="bar" style={{ background: `linear-gradient(90deg, ${lg.ramp.join(',')})` }} />
          <div className="ends"><span>{lg.min}</span>{lg.mid && <span>{lg.mid}</span>}<span>{lg.max}</span></div>
        </>
      )}
      {lg.note && (
        <div className="foot">
          {barrios === '3d' && /Altura/.test(lg.note) ? <ArrowUpFromLine aria-hidden="true" /> : <Info aria-hidden="true" />}
          <span>{lg.note}</span>
        </div>
      )}
      {bicing && (
        <div style={{ marginTop: 10 }}>
          <div className="ttl" style={{ marginBottom: 6 }}>Bicing · bicis libres ahora</div>
          <div className="bar" style={{ background: 'linear-gradient(90deg,#D9607F,#E8B04A,#E9DC7A,#4DB6A0)' }} />
          <div className="ends"><span>Vacía</span><span>Llena</span></div>
        </div>
      )}
    </motion.div>
  )
}

export default function MapControls() {
  const sel = useStore((s) => s.sel)
  const orbit = useStore((s) => s.orbit)
  const setOrbit = useStore((s) => s.setOrbit)
  const [presets, setPresets] = useState(false)
  const compass = useRef(null)
  const wrap = useRef(null)

  useEffect(() => {
    const map = getMap()
    if (!map) return
    const upd = () => { if (compass.current) compass.current.style.transform = `rotate(${-map.getBearing()}deg)` }
    map.on('rotate', upd)
    upd()
    return () => map.off('rotate', upd)
  }, [])
  useEffect(() => {
    if (!presets) return
    const close = (e) => { if (!wrap.current?.contains(e.target)) setPresets(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [presets])

  return (
    <motion.div className={`mapctl ${sel >= 0 ? 'shift' : ''}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 24 }}>
      <Legend />
      <div className="ctl-stack glass hide-m" data-tour="mapctl" ref={wrap} style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => zoomBy(0.8)} aria-label="Acercar"><Plus /></button>
        <button className="icon-btn" onClick={() => zoomBy(-0.8)} aria-label="Alejar"><Minus /></button>
        <button className="icon-btn" onClick={resetNorth} aria-label="Orientar al norte" title="Orientar al norte"><Compass ref={compass} className="compass" /></button>
        <button className="icon-btn" onClick={togglePitch} aria-label="Cambiar entre vista 2D y 3D" title="2D / 3D"><Box /></button>
        <button className="icon-btn" aria-pressed={orbit} onClick={() => setOrbit(!orbit)} aria-label="Órbita automática" title="Órbita automática (O)"><Orbit /></button>
        <button className="icon-btn" aria-expanded={presets} onClick={() => setPresets((p) => !p)} aria-label="Cámaras" title="Cámaras"><Video /></button>
        <AnimatePresence>
          {presets && (
            <motion.div className="presets glass" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}>
              <button onClick={() => { useStore.getState().setCinema({ active: true, idx: 0 }); setPresets(false) }}><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Clapperboard size={15} /> Vuelo cinematográfico</span><span className="kbd">V</span></button>
              {Object.entries(PRESETS).map(([k, p], i) => (
                <button key={k} onClick={() => { flyPreset(k); setPresets(false) }}>{p.label}<span className="kbd">{i + 1}</span></button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
