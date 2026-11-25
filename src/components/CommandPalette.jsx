import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, CalendarDays, Play, Route, Camera, Video, Orbit, Link2, Store, FlaskConical } from 'lucide-react'
import { downloadCapture, copyLink, VIEWS } from './TopBar.jsx'
import { setView } from '../engine/mapEngine.js'
import { BUSINESSES, SCENARIOS } from '../model/tools.js'
import { useStore } from '../store.js'
import { BARRIOS, normalizeName } from '../model/geo.js'
import { DAYS } from '../lib/colors.js'
import { selectBarrio, flyPreset, PRESETS } from '../engine/mapEngine.js'

function actions() {
  const s = useStore.getState()
  return [
    ...VIEWS.map((v) => ({ id: `view-${v.key}`, group: 'Ver', icon: v.icon, label: v.label, hint: v.kb, run: () => setView(v.key) })),
    ...DAYS.map((d, k) => ({ id: `day${k}`, group: 'Ir a', icon: CalendarDays, label: `${d.name}`, hint: `${k + 1}`, run: () => s.goDay(k) })),
    { id: 'play', group: 'Acciones', icon: Play, label: 'Reproducir la semana', hint: 'Espacio', run: () => { if (!useStore.getState().playing) s.togglePlay() } },
    { id: 'story', group: 'Acciones', icon: Route, label: 'Empezar el tour', hint: 'T', run: () => s.setStory({ active: true, idx: 0 }) },
    ...BUSINESSES.map((b) => ({ id: `biz-${b.key}`, group: 'Dónde abrir', icon: Store, label: `Dónde abrir: ${b.label.toLowerCase()}`, run: () => { setView('abrir'); s.setBusiness(b.key) } })),
    ...SCENARIOS.map((x) => ({ id: `sc-${x.key}`, group: 'Simulador', icon: FlaskConical, label: `Simular: ${x.label.toLowerCase()}`, run: () => { setView('simular'); s.setScenario(x.key) } })),
    ...useStore.getState().periods.filter((p) => p.kind !== 'month').map((p) => ({ id: `per-${p.id}`, group: 'Periodo', icon: CalendarDays, label: `Periodo: ${p.label}`, run: () => s.setPeriod(p.id) })),
    { id: 'orbit', group: 'Acciones', icon: Orbit, label: 'Órbita automática', hint: 'O', run: () => s.setOrbit(!useStore.getState().orbit) },
    { id: 'shot', group: 'Acciones', icon: Camera, label: 'Descargar captura del mapa', hint: 'P', run: downloadCapture },
    { id: 'link', group: 'Acciones', icon: Link2, label: 'Copiar enlace a esta vista', run: copyLink },
    ...Object.entries(PRESETS).map(([k, p]) => ({ id: `cam-${k}`, group: 'Cámara', icon: Video, label: `Cámara: ${p.label}`, run: () => flyPreset(k) })),
  ]
}

export default function CommandPalette() {
  const open = useStore((s) => s.cmdk)
  const setCmdk = useStore((s) => s.setCmdk)
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const listRef = useRef(null)

  const items = useMemo(() => {
    if (!open) return []
    const nq = normalizeName(q)
    const barrios = BARRIOS
      .map((b) => {
        const n = normalizeName(b.name)
        const score = !nq ? 0 : n.startsWith(nq) ? 3 : n.includes(nq) ? 2 : normalizeName(b.district).includes(nq) ? 1 : -1
        return { b, score }
      })
      .filter((o) => !nq || o.score >= 0)
      .sort((a, b) => b.score - a.score || a.b.name.localeCompare(b.b.name, 'es'))
      .slice(0, nq ? 8 : 5)
      .map(({ b }) => ({ id: `b${b.i}`, group: 'Barrios', icon: MapPin, label: b.name, hint: b.district, run: () => selectBarrio(b.i) }))
    const acts = actions().filter((a) => !nq || normalizeName(a.label).includes(nq))
    return [...barrios, ...acts]
  }, [q, open])

  useEffect(() => { setIdx(0) }, [q])
  useEffect(() => { if (!open) setQ('') }, [open])
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [idx])

  const run = (it) => { setCmdk(false); setTimeout(() => it.run(), 10) }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter' && items[idx]) { e.preventDefault(); run(items[idx]) }
    else if (e.key === 'Escape') { e.preventDefault(); setCmdk(false) }
  }

  let lastGroup = ''
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCmdk(false)} />
          <motion.div key="pal" className="palette glass" role="dialog" aria-label="Buscar" initial={{ opacity: 0, y: -12, scale: 0.98, x: '-50%' }} animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }} exit={{ opacity: 0, y: -8, scale: 0.98, x: '-50%', transition: { duration: 0.14 } }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            <Search className="pi" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Busca un barrio, un día o una acción…" aria-label="Buscar" aria-activedescendant={items[idx] ? `cmd-${items[idx].id}` : undefined} />
            <ul ref={listRef} role="listbox">
              {items.length === 0 && <li style={{ color: 'var(--ink-3)', cursor: 'default' }}>Nada coincide con «{q}». Prueba con el nombre de un barrio o de un distrito.</li>}
              {items.map((it, k) => {
                const header = it.group !== lastGroup
                lastGroup = it.group
                return (
                  <div key={it.id}>
                    {header && <div className="group">{it.group}</div>}
                    <li id={`cmd-${it.id}`} data-idx={k} role="option" aria-selected={k === idx} onMouseEnter={() => setIdx(k)} onClick={() => run(it)}>
                      <span className="ico"><it.icon /></span>
                      {it.label}
                      {it.hint && <small>{it.hint}</small>}
                    </li>
                  </div>
                )
              })}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
