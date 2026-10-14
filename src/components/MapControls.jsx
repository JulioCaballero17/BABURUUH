import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Compass, Box, Orbit, Video } from 'lucide-react'
import { useStore } from '../store.js'
import { zoomBy, resetNorth, togglePitch, getMap, flyPreset, PRESETS } from '../engine/mapEngine.js'
import { legendFor } from '../lib/legend.js'

function Legend() {
  const colorMode = useStore((s) => s.colorMode)
  const deltaBase = useStore((s) => s.deltaBase)
  const sel = useStore((s) => s.sel)
  const influenceDir = useStore((s) => s.influenceDir)
  const lg = legendFor({ colorMode, deltaBase, sel, influenceDir })
  const bicing = useStore((s) => s.layers.bicing && s.bicing)
  return (
    <motion.div className="legend glass" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }}>
      <div className="ttl"><span>{lg.title}</span></div>
      <div className="bar" style={{ background: `linear-gradient(90deg, ${lg.ramp.join(',')})` }} />
      <div className="ends"><span>{lg.min}</span><span>{lg.max}</span></div>
      {lg.note && <div className="ends" style={{ marginTop: 6 }}><span>{lg.note}</span></div>}
      {bicing && (
        <div style={{ marginTop: 10 }}>
          <div className="ttl" style={{ marginBottom: 6 }}><span>Bicing · bicis libres</span></div>
          <div className="bar" style={{ background: 'linear-gradient(90deg,#B44663,#E59A86,#E6D5A9,#5FBFAE)' }} />
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
      <div className="ctl-stack glass hide-m" ref={wrap} style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => zoomBy(0.8)} aria-label="Acercar"><Plus /></button>
        <button className="icon-btn" onClick={() => zoomBy(-0.8)} aria-label="Alejar"><Minus /></button>
        <button className="icon-btn" onClick={resetNorth} aria-label="Orientar al norte" title="Orientar al norte"><Compass ref={compass} className="compass" /></button>
        <button className="icon-btn" onClick={togglePitch} aria-label="Cambiar entre vista 2D y 3D" title="2D / 3D"><Box /></button>
        <button className="icon-btn" aria-pressed={orbit} onClick={() => setOrbit(!orbit)} aria-label="Órbita automática" title="Órbita automática (O)"><Orbit /></button>
        <button className="icon-btn" aria-expanded={presets} onClick={() => setPresets((p) => !p)} aria-label="Cámaras" title="Cámaras"><Video /></button>
        <AnimatePresence>
          {presets && (
            <motion.div className="presets glass" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}>
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
