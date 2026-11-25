import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, X, Maximize, Minimize, MousePointerClick } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../store.js'
import { buildTour, BASE } from '../lib/tour.js'
import { flyTo } from '../engine/mapEngine.js'

// Put the app in the state a step needs. Every step starts from BASE, so any step can be opened directly.
// Delayed actions check the token so they never leak into the next step.
let token = 0
function applyStep(step) {
  const my = ++token
  const later = (fn, ms) => setTimeout(() => { if (my === token && useStore.getState().story.active) fn() }, ms)
  const s = useStore.getState()
  const st = step.state || {}
  useStore.setState({
    ...BASE,
    ...st,
    layers: { ...s.layers, ...BASE.layers, ...(st.layers || {}) },
    panel: window.innerWidth < 760 ? null : (st.panel ?? null),
    tween: null,
  })
  if (st.t != null) s.goTo(st.t, 1200)
  if (st.playing) later(() => useStore.setState({ playing: true }), 1250)
  if (step.cam) later(() => flyTo(step.cam, 2600), 60)
  if (step.scroll) later(() => document.querySelector(`[data-tour="${step.scroll}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 650)
}

function resetAfterTour() {
  token++
  const s = useStore.getState()
  useStore.setState({ ...BASE, layers: { ...s.layers, ...BASE.layers } })
  flyTo({ center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 }, 2000)
}

const rich = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith('**') ? <b key={k}>{p.slice(2, -2)}</b> : <span key={k}>{p}</span>))

// Yellow ring that follows the control the current step talks about.
function Spotlight({ target, badge }) {
  const [rect, setRect] = useState(null)
  useEffect(() => {
    let raf = 0
    let last = ''
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = target && document.querySelector(`[data-tour="${target}"]`)
      const r = el?.getBoundingClientRect()
      const key = r && r.width ? `${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}` : ''
      if (key !== last) { last = key; setRect(key ? { left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12 } : null) }
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [target])
  if (!rect) return null
  return (
    <>
      <div className="tour-ring" style={rect} aria-hidden="true" />
      {badge && (rect.top < 110
        ? <div className="tour-badge inside" style={{ left: rect.left + 14, top: rect.top + 14 }} aria-hidden="true">{badge}</div>
        : <div className="tour-badge" style={{ left: rect.left + rect.width / 2, top: rect.top }} aria-hidden="true">{badge}</div>)}
    </>
  )
}

function placeStyle(place) {
  const g = 'var(--gap)'
  if (place === 'top-right') return { right: g, top: `calc(${g} * 2 + var(--top-h))` }
  if (place === 'bottom-right') return { right: g, bottom: `calc(${g} * 2 + var(--dock-h))` }
  return { left: `calc(${g} * 2 + var(--rail-w))`, bottom: `calc(${g} * 2 + var(--dock-h))` }
}

export default function Tour() {
  const story = useStore((s) => s.story)
  const setStory = useStore((s) => s.setStory)
  const ds = useStore((s) => s.dataset)
  const ctx = useStore(useShallow((s) => ({ summary: s.summary, periods: s.periods, period: s.period, segment: s.segment, comparePeriod: s.comparePeriod, metroLines: s.metroLines })))
  // texts are frozen when the tour starts, so they don't jump while a step changes the colour mode
  const frozen = useRef(null)
  const steps = useMemo(() => {
    if (!story.active) { frozen.current = null; return [] }
    if (!frozen.current || frozen.current.ds !== ds || (!frozen.current.summary && ctx.summary) || (!frozen.current.metro && ctx.metroLines.length)) frozen.current = { ds, summary: ctx.summary, metro: ctx.metroLines.length, steps: buildTour(ds, ctx) }
    return frozen.current.steps
  }, [story.active, ds, ctx])
  const idx = Math.min(story.idx, Math.max(0, steps.length - 1))
  const step = steps[idx]
  const [full, setFull] = useState(false)
  const wasActive = useRef(false)

  useEffect(() => {
    if (story.active && step) applyStep(step)
    if (!story.active && wasActive.current) resetAfterTour()
    wasActive.current = story.active
  }, [story.active, idx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const close = () => setStory({ active: false, idx: 0 })
  const go = (k) => setStory({ active: true, idx: Math.max(0, Math.min(steps.length - 1, k)) })
  const next = () => (idx < steps.length - 1 ? go(idx + 1) : close())
  const prev = () => idx > 0 && go(idx - 1)
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  useEffect(() => {
    if (!story.active) return
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select')) return
      const k = e.key
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.target.closest?.('button')) || (k === 'Enter' && !e.target.closest?.('button'))) { e.preventDefault(); e.stopImmediatePropagation(); next() }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); prev() }
      else if (k === 'Escape') { e.stopImmediatePropagation(); close() }
      else if (k.toLowerCase() === 'f') { e.stopImmediatePropagation(); toggleFull() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <AnimatePresence>
      {story.active && step && (
        <>
          <Spotlight key={`ring-${step.id}`} target={step.target} badge={step.badge} />
          <motion.article
            key="tour"
            className="tour-card glass"
            role="dialog"
            aria-label="Tour de Baburu"
            style={placeStyle(step.place)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <div className="tc-top">
              <span className="tc-step">Tour · <b>{idx + 1}</b> de {steps.length}</span>
              <span style={{ display: 'flex', gap: 2 }}>
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={toggleFull} aria-label={full ? 'Salir de pantalla completa' : 'Pantalla completa'} title="Pantalla completa (F)">{full ? <Minimize /> : <Maximize />}</button>
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={close} aria-label="Salir del tour" title="Salir (Esc)"><X /></button>
              </span>
            </div>
            <motion.div key={step.id} className="tc-body" aria-live="polite" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}>
              <h2>{step.title}</h2>
              <p>{rich(step.body)}</p>
              {step.hint && <div className="tc-hint"><MousePointerClick aria-hidden="true" /> {step.hint}</div>}
            </motion.div>
            <div className="tc-foot">
              <div className="tour-progress" aria-hidden="true">
                {steps.map((x, k) => <i key={x.id} className={k === idx ? 'now' : k < idx ? 'on' : ''} onClick={() => go(k)} title={x.title} />)}
              </div>
              <button className="btn ghost sm" onClick={prev} disabled={idx === 0} aria-label="Paso anterior"><ArrowLeft /></button>
              <button className="btn accent sm" onClick={next} autoFocus>{step.last ? 'Terminar' : 'Siguiente'} {!step.last && <ArrowRight />}</button>
            </div>
          </motion.article>
        </>
      )}
    </AnimatePresence>
  )
}
