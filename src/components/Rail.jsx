import { motion } from 'framer-motion'
import { Layers, ChartColumnBig, Database } from 'lucide-react'
import { useStore } from '../store.js'

// Panels, grouped the way people think about them: how the map looks, what the data says, where it comes from.
export const PANELS = [
  { key: 'capas', group: 'mapa', label: 'Capas y colores', kb: 'L' },
  { key: 'ranking', group: 'analisis', label: 'Ranking', kb: 'R' },
  { key: 'distritos', group: 'analisis', label: 'Distritos', kb: 'G' },
  { key: 'estudio', group: 'analisis', label: 'Burbujas', kb: 'B' },
  { key: 'hallazgos', group: 'analisis', label: 'Hallazgos', kb: 'N' },
  { key: 'datos', group: 'datos', label: 'Datos', kb: 'I' },
]
export const GROUPS = [
  { key: 'mapa', label: 'Mapa', icon: Layers, first: 'capas', title: 'Capas y colores del mapa (L)' },
  { key: 'analisis', label: 'Análisis', icon: ChartColumnBig, first: 'ranking', title: 'Ranking, distritos, burbujas y hallazgos (R)' },
  { key: 'datos', label: 'Datos', icon: Database, first: 'datos', title: 'Periodo, tipo de viajero, importar y exportar (I)' },
]
export const groupOf = (panel) => PANELS.find((p) => p.key === panel)?.group || null

const lastTab = {}

export default function Rail() {
  const panel = useStore((s) => s.panel)
  const openPanel = useStore((s) => s.openPanel)
  const current = groupOf(panel)
  if (panel) lastTab[current] = panel
  const toggle = (g) => {
    if (current === g.key) useStore.setState({ panel: null })
    else openPanel(lastTab[g.key] || g.first)
  }
  return (
    <motion.nav className="rail glass" aria-label="Secciones" data-tour="rail" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 24, delay: 0.2 }}>
      {GROUPS.map((g) => (
        <button key={g.key} className="rail-btn" data-tour={`rail-${g.key}`} aria-current={current === g.key} aria-expanded={current === g.key} onClick={() => toggle(g)} title={g.title}>
          {current === g.key && <motion.span layoutId="rail-active" className="rail-active" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
          <g.icon aria-hidden="true" />
          <span>{g.label}</span>
        </button>
      ))}
    </motion.nav>
  )
}
