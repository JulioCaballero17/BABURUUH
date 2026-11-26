// Presentation mode: full screen, no panels, the five modes one after another with one sentence each,
// written from the data. Made for the demo video and for presenting in class.
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useStore } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { DAYS } from '../lib/colors.js'
import { fmtK, pct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'
import { getScores, getSim, getVisitors } from '../engine/toolState.js'
import { setView, selectBarrio, replaySim } from '../engine/mapEngine.js'

const DUR = 12000

function useScenes() {
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  return useMemo(() => {
    const s = useStore.getState()
    const dn = DAYS[day].name.toLowerCase()
    const busiest = [...ds.ARR[day].keys()].sort((a, b) => ds.ARR[day][b] - ds.ARR[day][a])[0]
    const top = getScores({ ...s, business: 'ocio' }).top[0]
    const sim = getSim({ ...s, scenario: 'evento', simPlace: -1, simAmount: null })
    const origins = sim.flows.slice(0, 2).map((f) => BARRIOS[f.i].short)
    const vis = getVisitors({ ...s, visitorKind: 'all' })
    let tour = -1
    if (vis) for (let i = 0; i < vis.share.length; i++) if (ds.ARR[day][i] >= 200 && (tour < 0 || vis.share[i] > vis.share[tour])) tour = i
    return [
      { view: 'mapa', title: 'La semana', text: `Un ${dn} cualquiera hay ${fmtK(ds.MOV[day])} viajes entre barrios. Cada luz es un trayecto real; el barrio que más gente recibe es ${BARRIOS[busiest].short}.`, apply: () => useStore.setState({ playing: true }) },
      { view: 'metro', title: 'Metro', text: 'Si el metro se dibujara solo con estos datos, estas serían sus cinco líneas: las rutas por las que más se mueve la ciudad.' },
      { view: 'abrir', title: 'Dónde abrir', text: top ? `El mejor barrio para abrir un bar es ${BARRIOS[top.i].short}: nota ${Math.round(top.score * 100)} sobre 100. Las líneas son sus clientes posibles.` : 'Qué barrio encaja con cada tipo de negocio, y por qué.', apply: () => useStore.getState().setBusiness('ocio') },
      { view: 'simular', title: 'Simulador', text: sim.place >= 0 ? `Un evento de ${fmtK(sim.amount)} personas en ${BARRIOS[sim.place].short}: llegan sobre todo desde ${origins.join(' y ')}.` : 'Qué pasaría si cambia algo en la ciudad.', apply: () => { useStore.getState().setScenario('evento'); setTimeout(replaySim, 600) } },
      { view: 'turismo', title: 'Turismo', text: tour >= 0 ? `${BARRIOS[tour].short} es el barrio con más visitantes: ${pct(vis.share[tour])} de quien llega viene de fuera de Barcelona.` : 'Dónde van los visitantes, y cuándo.', apply: () => useStore.setState({ visitorKind: 'all' }) },
    ]
  }, [ds, day])
}

function Show() {
  const scenes = useScenes()
  const [k, setK] = useState(0)
  const [paused, setPaused] = useState(false)
  const scene = scenes[k]
  const exit = () => useStore.setState({ presenting: false })

  // enter: full screen and a clean map; leave: restore
  useEffect(() => {
    document.documentElement.classList.add('presenting')
    selectBarrio(-1)
    useStore.getState().setStory({ active: false, idx: 0 })
    document.documentElement.requestFullscreen?.().catch(() => {})
    const onFs = () => { if (!document.fullscreenElement) exit() }
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.documentElement.classList.remove('presenting')
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
      useStore.setState({ playing: false })
    }
  }, [])

  // show the scene
  useEffect(() => {
    if (useStore.getState().view !== scene.view) setView(scene.view)
    scene.apply?.()
  }, [k]) // eslint-disable-line react-hooks/exhaustive-deps

  // advance
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setK((x) => (x + 1) % scenes.length), DUR)
    return () => clearTimeout(t)
  }, [k, paused, scenes.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); exit() }
      else if (e.key === 'ArrowRight') setK((x) => (x + 1) % scenes.length)
      else if (e.key === 'ArrowLeft') setK((x) => (x - 1 + scenes.length) % scenes.length)
      else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scenes.length])

  return (
    <div className="presenter" role="region" aria-label="Modo presentación" aria-roledescription="presentación">
      <div className="pr-card" key={k}>
        <p className="pr-step"><span>{k + 1}</span>/{scenes.length}</p>
        <h2>{scene.title}</h2>
        <p className="pr-text" aria-live="polite">{scene.text}</p>
        <div className="pr-progress" aria-hidden="true">
          {scenes.map((x, q) => <i key={x.view} className={q < k ? 'done' : q === k ? (paused ? 'now paused' : 'now') : ''} style={{ '--dur': `${DUR}ms` }} />)}
        </div>
      </div>
      <div className="pr-ctl" role="toolbar" aria-label="Controles de la presentación">
        <button className="icon-btn" onClick={() => setK((x) => (x - 1 + scenes.length) % scenes.length)} aria-label="Anterior"><ChevronLeft /></button>
        <button className="icon-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Reanudar' : 'Pausar'}>{paused ? <Play /> : <Pause />}</button>
        <button className="icon-btn" onClick={() => setK((x) => (x + 1) % scenes.length)} aria-label="Siguiente"><ChevronRight /></button>
        <button className="icon-btn" onClick={exit} aria-label="Salir de la presentación"><X /></button>
      </div>
    </div>
  )
}

export default function Presenter() {
  const on = useStore((s) => s.presenting)
  return on ? <Show /> : null
}
