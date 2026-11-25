import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '../store.js'
import { flyTo, setView } from '../engine/mapEngine.js'
import { BARRIOS } from '../model/geo.js'
import { visitorShares } from '../model/derive.js'
import { DAYS } from '../lib/colors.js'
import { fmt, pct } from '../lib/format.js'

// "Vuelo": a cinematic, hands-free flight over the city. The interface hides, the frame gets
// letterbox bars, and each shot comes with a big caption written from the data.
function buildShots(ds, day, particleInfo) {
  const dn = DAYS[day].name.toLowerCase()
  const top = [...ds.ARR[day].keys()].sort((a, b) => ds.ARR[day][b] - ds.ARR[day][a]).slice(0, 5)
  const vis = visitorShares(ds, day, 'all')
  const shots = [
    { id: 'city', view: 'mapa', cam: { center: [2.163, 41.392], zoom: 11.9, pitch: 60, bearing: -38 }, eyebrow: 'Baburu', title: 'Barcelona', sub: `${fmt(ds.MOV[day])} viajes entre barrios un ${dn} medio`, dur: 8000, orbit: true },
    ...top.map((i, k) => ({
      id: `b${i}`,
      view: 'mapa',
      sel: i,
      cam: { center: BARRIOS[i].c, zoom: 13.5, pitch: 66, bearing: -60 + k * 47 },
      eyebrow: `${String(k + 1).padStart(2, '0')} · ${BARRIOS[i].district}`,
      title: BARRIOS[i].name,
      sub: `${fmt(ds.ARR[day][i])} llegadas un ${dn}${vis ? ` · el ${pct(vis[i])} viene de fuera de Barcelona` : ''}`,
      dur: 7000,
      orbit: true,
    })),
    { id: 'flujo', view: 'flujo', cam: { center: [2.165, 41.398], zoom: 12.5, pitch: 52, bearing: 12 }, eyebrow: 'En movimiento', title: 'Así se mueve la ciudad', sub: particleInfo?.perDot ? `Cada punto son unos ${fmt(particleInfo.perDot)} viajes reales` : 'Cada punto es un grupo de viajes reales', dur: 10000, orbit: true },
    { id: 'metro', view: 'metro', cam: { center: [2.172, 41.403], zoom: 12.35, pitch: 0, bearing: 0 }, eyebrow: 'Plano de la demanda', title: 'El metro que pide Barcelona', sub: 'Cinco líneas trazadas solo con los datos de movilidad', dur: 10000, orbit: false },
  ]
  return shots
}

export default function Cinema() {
  const cinema = useStore((s) => s.cinema)
  const ds = useStore((s) => s.dataset)
  const particleInfo = useStore((s) => s.particleInfo)
  const day = useStore((s) => Math.round(s.t) % 5)
  const shots = useMemo(() => (cinema.active ? buildShots(ds, day, particleInfo) : []), [cinema.active, ds]) // eslint-disable-line react-hooks/exhaustive-deps
  const shot = shots[cinema.idx]
  const timer = useRef(0)

  const stop = () => {
    clearTimeout(timer.current)
    useStore.setState({ cinema: { active: false, idx: 0 }, orbit: false, sel: -1 })
    setView('mapa')
  }

  useEffect(() => {
    if (!cinema.active || !shot) return
    const s = useStore.getState()
    useStore.setState({ panel: null, sel: shot.sel ?? -1, orbit: false, playing: false, view: shot.view, cmdk: false, compareOpen: false, story: { active: false, idx: 0 } })
    flyTo(shot.cam, cinema.idx === 0 ? 3600 : 3200)
    const orbitT = setTimeout(() => { if (useStore.getState().cinema.active) useStore.setState({ orbit: !!shot.orbit }) }, 3300)
    timer.current = setTimeout(() => {
      const st = useStore.getState()
      if (!st.cinema.active) return
      if (cinema.idx < shots.length - 1) useStore.setState({ cinema: { active: true, idx: cinema.idx + 1 } })
      else stop()
    }, shot.dur)
    void s
    return () => { clearTimeout(timer.current); clearTimeout(orbitT) }
  }, [cinema.active, cinema.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cinema.active) return
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); stop() }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); if (cinema.idx < shots.length - 1) useStore.setState({ cinema: { active: true, idx: cinema.idx + 1 } }); else stop() }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); if (cinema.idx > 0) useStore.setState({ cinema: { active: true, idx: cinema.idx - 1 } }) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <AnimatePresence>
      {cinema.active && shot && (
        <motion.div key="cinema" className="cinema-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <motion.div className="letterbox top" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }} transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }} />
          <motion.div className="letterbox bottom" initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }} transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }} />
          <motion.div key={shot.id} className="cinema-caption" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 1.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] } }}>
            <p className="eyebrow">{shot.eyebrow}</p>
            <h2>{shot.title}</h2>
            <p className="sub">{shot.sub}</p>
          </motion.div>
          <div className="cinema-progress" aria-hidden="true">
            {shots.map((x, k) => (
              <i key={x.id} className={k < cinema.idx ? 'done' : k === cinema.idx ? 'now' : ''}>
                {k === cinema.idx && <motion.b key={shot.id} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: shot.dur / 1000, ease: 'linear' }} />}
              </i>
            ))}
          </div>
          <button className="cinema-exit" onClick={stop} aria-label="Salir del vuelo (Esc)"><X /> Salir</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
