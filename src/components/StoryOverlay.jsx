import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useStore } from '../store.js'
import { buildChapters } from '../lib/stories.js'
import { flyTo } from '../engine/mapEngine.js'

export function applyChapter(c) {
  const s = useStore.getState()
  useStore.setState({
    sel: c.sel,
    colorMode: c.colorMode,
    ...(c.deltaBase != null ? { deltaBase: c.deltaBase } : {}),
    ...(c.influenceDir ? { influenceDir: c.influenceDir } : {}),
    layers: { ...s.layers, ...c.layers },
    panel: c.panel ?? (window.innerWidth < 760 ? null : s.panel === 'historias' ? null : s.panel),
  })
  s.goTo(c.t, 1600)
  flyTo(c.cam, 3200)
}

const rich = (text) => text.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith('**') ? <b key={k}>{p.slice(2, -2)}</b> : <span key={k}>{p}</span>))

export default function StoryOverlay() {
  const story = useStore((s) => s.story)
  const ds = useStore((s) => s.dataset)
  const setStory = useStore((s) => s.setStory)
  const chapters = useMemo(() => buildChapters(ds), [ds])
  const c = chapters[story.idx]

  useEffect(() => { if (story.active && c) applyChapter(c) }, [story.active, story.idx]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!story.active) return
    const onKey = (e) => {
      if (e.target.closest?.('input,textarea')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); e.stopImmediatePropagation(); next() }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); e.stopImmediatePropagation(); prev() }
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setStory({ active: false, idx: 0 }) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const next = () => (story.idx < chapters.length - 1 ? setStory({ active: true, idx: story.idx + 1 }) : setStory({ active: false, idx: 0 }))
  const prev = () => story.idx > 0 && setStory({ active: true, idx: story.idx - 1 })

  return (
    <AnimatePresence>
      {story.active && c && (
        <motion.article key="story" className="story glass" initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 220, damping: 26 }} aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="k">Capítulo {story.idx + 1} de {chapters.length}</span>
            <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setStory({ active: false, idx: 0 })} aria-label="Salir del recorrido"><X /></button>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={c.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              <h2>{c.title}</h2>
              <p>{rich(c.body)}</p>
            </motion.div>
          </AnimatePresence>
          <div className="story-foot">
            <div className="story-dots" aria-hidden="true">{chapters.map((x, k) => <i key={x.id} className={k <= story.idx ? 'on' : ''} />)}</div>
            <button className="btn ghost sm" onClick={prev} disabled={story.idx === 0} aria-label="Capítulo anterior"><ArrowLeft /></button>
            <button className="btn primary sm" onClick={next}>{story.idx < chapters.length - 1 ? 'Siguiente' : 'Terminar'} <ArrowRight /></button>
          </div>
        </motion.article>
      )}
    </AnimatePresence>
  )
}
