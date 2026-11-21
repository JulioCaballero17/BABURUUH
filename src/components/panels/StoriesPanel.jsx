import { motion } from 'framer-motion'
import { Route } from 'lucide-react'
import { useStore } from '../../store.js'
import { stagger } from '../ui/primitives.jsx'
import { selectBarrio } from '../../engine/mapEngine.js'
import { DAYS } from '../../lib/colors.js'

// Automatic findings, recalculated for whatever period, traveller type or CSV is loaded.
export default function InsightsPanel() {
  const ds = useStore((s) => s.dataset)
  const setStory = useStore((s) => s.setStory)
  const goTo = useStore((s) => s.goTo)

  return (
    <>
      <section>
        <div className="section-title"><h3>Hallazgos automáticos</h3><span>se recalculan con los datos</span></div>
        <div style={{ display: 'grid', gap: 8 }}>
          {ds.insights.map((it, k) => (
            <motion.button key={it.title} className="insight" {...stagger(k)} onClick={() => { goTo(it.t, 1200); if (it.sel != null) selectBarrio(it.sel) }}>
              <b>{it.title}</b>
              <span>{it.text}</span>
              <span className="note">{DAYS[it.day].name}{it.sel != null ? ' · abre la ficha del barrio' : ''}</span>
            </motion.button>
          ))}
        </div>
      </section>
      <section>
        <button className="btn outline" style={{ width: '100%' }} onClick={() => setStory({ active: true, idx: 0 })}><Route /> Ver el tour de la aplicación</button>
      </section>
    </>
  )
}
