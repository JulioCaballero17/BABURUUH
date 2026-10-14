import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { useStore } from '../../store.js'
import { buildChapters } from '../../lib/stories.js'
import { DAYS } from '../../lib/colors.js'
import { stagger } from '../ui/primitives.jsx'
import { selectBarrio } from '../../engine/mapEngine.js'

export default function StoriesPanel() {
  const ds = useStore((s) => s.dataset)
  const setStory = useStore((s) => s.setStory)
  const goTo = useStore((s) => s.goTo)
  const chapters = useMemo(() => buildChapters(ds), [ds])

  return (
    <>
      <section>
        <button className="btn primary" style={{ width: '100%', height: 46 }} onClick={() => setStory({ active: true, idx: 0 })}>
          <Play /> Empezar el recorrido · {chapters.length} capítulos
        </button>
        <p className="note" style={{ marginTop: 8 }}>Pensado para presentar: avanza con las flechas del teclado, la cámara y los datos se colocan solos.</p>
        <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 2 }}>
          {chapters.map((c, k) => (
            <motion.li key={c.id} {...stagger(k)}>
              <button className="row" style={{ width: '100%' }} onClick={() => setStory({ active: true, idx: k })}>
                <span className="num" style={{ width: 22, color: 'var(--ink-3)', fontSize: 12 }}>{String(k + 1).padStart(2, '0')}</span>
                <span className="txt"><b>{c.title}</b><small>{DAYS[Math.floor(c.t / 24)].name}</small></span>
              </button>
            </motion.li>
          ))}
        </ol>
      </section>
      <section>
        <div className="section-title"><h3>Hallazgos automáticos</h3><span>se recalculan con tus datos</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          {ds.insights.map((it, k) => (
            <motion.button key={it.title} className="insight" style={{ '--hue': DAYS[it.day].hue }} {...stagger(k)} onClick={() => { goTo(it.t, 1200); if (it.sel != null) selectBarrio(it.sel) }}>
              <b>{it.title}</b>
              <span>{it.text}</span>
            </motion.button>
          ))}
        </div>
      </section>
    </>
  )
}
