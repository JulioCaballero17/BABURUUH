import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '../store.js'
import { panelMotion } from './ui/primitives.jsx'
import LayersPanel from './panels/LayersPanel.jsx'
import StudyPanel from './panels/StudyPanel.jsx'
import RankingPanel from './panels/RankingPanel.jsx'
import DistrictsPanel from './panels/DistrictsPanel.jsx'
import StoriesPanel from './panels/StoriesPanel.jsx'
import DataPanel from './panels/DataPanel.jsx'

const META = {
  capas: { eyebrow: 'Mapa', title: 'Capas y lectura', text: 'Qué se ve sobre el satélite y cómo se colorean los barrios.', C: LayersPanel },
  estudio: { eyebrow: 'Estudio', title: 'La hipótesis de la burbuja', text: '¿Los barrios con más restaurantes retienen a su gente por la noche?', C: StudyPanel },
  ranking: { eyebrow: 'En directo', title: 'Ranking de barrios', text: 'Quién recibe, quién vacía y quién se queda, hora a hora.', C: RankingPanel },
  distritos: { eyebrow: 'Flujos', title: 'De distrito a distrito', text: 'Los 10 distritos y la gente que circula entre ellos a esta hora.', C: DistrictsPanel },
  historias: { eyebrow: 'Narrativa', title: 'Historias de la semana', text: 'Recorridos guiados por lo más llamativo de los datos.', C: StoriesPanel },
  datos: { eyebrow: 'Datos', title: 'Tus datos', text: 'Sustituye los datos simulados por los reales en segundos.', C: DataPanel },
}

export default function SidePanel() {
  const panel = useStore((s) => s.panel)
  const setPanel = useStore((s) => s.setPanel)
  const m = META[panel]
  return (
    <AnimatePresence mode="wait">
      {m && (
        <motion.aside key={panel} className="side-panel glass" aria-label={m.title} {...panelMotion}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{m.eyebrow}</p>
              <h2>{m.title}</h2>
              <p>{m.text}</p>
            </div>
            <button className="icon-btn" onClick={() => setPanel(panel)} aria-label="Cerrar panel"><X /></button>
          </div>
          <div className="panel-body">
            <m.C />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
