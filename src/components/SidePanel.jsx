import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useStore } from '../store.js'
import { panelMotion } from './ui/primitives.jsx'
import { PANELS, groupOf } from './Rail.jsx'
import LayersPanel from './panels/LayersPanel.jsx'
import StudyPanel from './panels/StudyPanel.jsx'
import RankingPanel from './panels/RankingPanel.jsx'
import DistrictsPanel from './panels/DistrictsPanel.jsx'
import InsightsPanel from './panels/StoriesPanel.jsx'
import DataPanel from './panels/DataPanel.jsx'

const GROUP_META = {
  mapa: { eyebrow: 'Mapa', title: 'Capas y colores', text: 'Qué significa el color de cada barrio y qué se dibuja encima.' },
  analisis: { eyebrow: 'Análisis', title: 'Qué dicen los datos', text: 'Rankings, flujos entre distritos, la hipótesis de las burbujas y hallazgos automáticos.' },
  datos: { eyebrow: 'Datos', title: 'Periodo y fuente', text: 'Elige el mes o el año y el tipo de viajero. También puedes importar o exportar CSV.' },
}
const PANEL_C = { capas: LayersPanel, ranking: RankingPanel, distritos: DistrictsPanel, estudio: StudyPanel, hallazgos: InsightsPanel, datos: DataPanel }

export default function SidePanel() {
  const panel = useStore((s) => s.panel)
  const openPanel = useStore((s) => s.openPanel)
  const group = groupOf(panel)
  const m = GROUP_META[group]
  const C = PANEL_C[panel]
  const tabs = PANELS.filter((p) => p.group === group)
  return (
    <>
      {m && C && (
        <motion.aside key={group} className="side-panel glass" aria-label={m.title} data-tour="panel" initial={panelMotion.initial} animate={panelMotion.animate}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{m.eyebrow}</p>
              <h2>{m.title}</h2>
              <p>{m.text}</p>
            </div>
            <button className="icon-btn" onClick={() => useStore.setState({ panel: null })} aria-label="Cerrar panel"><X /></button>
          </div>
          {tabs.length > 1 && (
            <div className="tabs" role="tablist" aria-label={m.title}>
              {tabs.map((t) => (
                <button key={t.key} role="tab" data-tour={`tab-${t.key}`} aria-selected={panel === t.key} onClick={() => openPanel(t.key)} title={`${t.label} (${t.kb})`}>
                  {t.label}
                  {panel === t.key && <motion.span layoutId="tab-line" className="tab-line" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
                </button>
              ))}
            </div>
          )}
          <div className="panel-body" key={panel}>
            <C />
          </div>
        </motion.aside>
      )}
    </>
  )
}
