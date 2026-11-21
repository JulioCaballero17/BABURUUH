import { motion } from 'framer-motion'
import { Search, Camera, Link2, Sun, Moon, CircleHelp, Route } from 'lucide-react'
import { useStore, selectDark } from '../store.js'
import { BrandMark } from './ui/primitives.jsx'
import { capturePNG } from '../engine/mapEngine.js'
import { dayName } from '../lib/week.js'
import { legendFor, MODES } from '../lib/legend.js'

export async function downloadCapture() {
  const s = useStore.getState()
  const lg = legendFor(s)
  const url = await capturePNG({
    title: `${dayName(s.t)} medio`,
    subtitle: `Baburu · ${s.dataset.source.label} · ${MODES[s.colorMode]?.label || ''}`,
    legend: lg.min || lg.max ? lg : null,
  })
  if (!url) return
  const a = document.createElement('a')
  a.download = `baburu-${s.period}-${dayName(s.t).toLowerCase()}.png`
  a.href = url
  a.click()
  s.toast('Captura descargada.')
}

export async function copyLink() {
  const toast = useStore.getState().toast
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast('Enlace copiado: abre exactamente esta vista.')
  } catch {
    toast('No se pudo copiar. Copia la dirección del navegador.', 'info')
  }
}

export default function TopBar() {
  const setCmdk = useStore((s) => s.setCmdk)
  const dark = useStore(selectDark)
  const setTheme = useStore((s) => s.setTheme)
  const setHelp = useStore((s) => s.setHelp)
  const setStory = useStore((s) => s.setStory)
  const tourOn = useStore((s) => s.story.active)
  const source = useStore((s) => s.dataset.source)
  const dataState = useStore((s) => s.dataState)

  return (
    <motion.header className="topbar" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 24, delay: 0.1 }}>
      <div className="brand glass" data-tour="brand">
        <BrandMark />
        <div className="brand-text">
          <div className="brand-name">Baburu</div>
          <div className="brand-meta"><span className="dot live" /> {dataState === 'loading' ? 'Cargando datos…' : source.label}</div>
        </div>
      </div>
      <div className="actions glass" data-tour="actions">
        <button className="search-btn" data-tour="search" onClick={() => setCmdk(true)} aria-label="Buscar barrio o acción">
          <Search /> <span className="lbl">Buscar un barrio o una acción</span> <span className="kbd">Ctrl K</span>
        </button>
        <button className="tour-btn" data-tour="tour-btn" onClick={() => setStory({ active: !tourOn, idx: 0 })} aria-pressed={tourOn} title="Recorrido por todas las funciones (T)">
          <Route aria-hidden="true" /> {tourOn ? <>Salir<span className="hide-m"> del tour</span></> : 'Tour'}
        </button>
        <span className="divider-v" />
        <button className="icon-btn hide-m" data-tour="capture" onClick={downloadCapture} aria-label="Descargar captura del mapa" title="Descargar captura (P)"><Camera /></button>
        <button className="icon-btn hide-m" data-tour="share" onClick={copyLink} aria-label="Copiar enlace a esta vista" title="Copiar enlace a esta vista"><Link2 /></button>
        <button className="icon-btn" onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'} title={dark ? 'Tema claro' : 'Tema oscuro'}>{dark ? <Sun /> : <Moon />}</button>
        <button className="icon-btn hide-m" onClick={() => setHelp(true)} aria-label="Atajos y ayuda" title="Atajos (?)"><CircleHelp /></button>
      </div>
    </motion.header>
  )
}
