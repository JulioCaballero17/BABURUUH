import { motion } from 'framer-motion'
import { Layers, FlaskConical, Trophy, Network, BookOpen, Database } from 'lucide-react'
import { useStore } from '../store.js'

export const PANELS = [
  { key: 'capas', label: 'Capas', icon: Layers, kb: 'L' },
  { key: 'estudio', label: 'Burbujas', icon: FlaskConical, kb: 'B' },
  { key: 'ranking', label: 'Ranking', icon: Trophy, kb: 'R' },
  { key: 'distritos', label: 'Distritos', icon: Network, kb: 'G' },
  { key: 'historias', label: 'Historias', icon: BookOpen, kb: 'S' },
  { key: 'datos', label: 'Datos', icon: Database, kb: 'I' },
]

export default function Rail() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  return (
    <motion.nav className="rail glass" aria-label="Paneles" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.2 }}>
      {PANELS.map((p, k) => (
        <motion.button
          key={p.key}
          className="rail-btn"
          aria-current={panel === p.key}
          onClick={() => setPanel(p.key)}
          title={`${p.label} (${p.kb})`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.3 + k * 0.05 } }}
        >
          {panel === p.key && <motion.span layoutId="rail-active" className="rail-active" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
          <p.icon aria-hidden="true" />
          <span>{p.label}</span>
        </motion.button>
      ))}
    </motion.nav>
  )
}
