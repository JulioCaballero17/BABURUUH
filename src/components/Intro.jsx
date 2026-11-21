import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store.js'
import { startIntro, skipIntro } from '../engine/mapEngine.js'
import { fmtK } from '../lib/format.js'

export default function Intro() {
  const intro = useStore((s) => s.intro)
  const ds = useStore((s) => s.dataset)
  const dataState = useStore((s) => s.dataState)
  const periods = useStore((s) => s.periods)
  const months = periods.filter((p) => p.kind === 'month')
  const total = ds.DAYTOT.reduce((a, b) => a + b, 0) / 5

  useEffect(() => {
    const onKey = (e) => {
      if (intro === 'globe' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startIntro() }
      if (e.key === 'Escape') skipIntro()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intro])

  return (
    <AnimatePresence>
      {intro === 'globe' && (
        <motion.section key="hero" className="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}>
          <div className="intro-inner">
            <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}>
              Movilidad entre barrios · Barcelona
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.45, type: 'spring', stiffness: 120, damping: 20 } }}>
              Baburu
              <span>Cómo se mueve la gente entre los 73 barrios de Barcelona.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8 } }}>
              De dónde sale la gente y adónde va cada día laborable, qué barrios atraen visitantes y cómo cambia la ciudad de un mes a otro. Con los datos de movilidad de Telefónica.
            </motion.p>
            <motion.div className="intro-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}>
              <button className="go" onClick={startIntro} autoFocus>
                Entrar en el mapa <ArrowRight />
              </button>
              <button className="skip" onClick={skipIntro}>Saltar animación</button>
            </motion.div>
            <motion.div className="intro-stats" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.25 } }}>
              <div><b>73</b><span>barrios</span></div>
              <div><b>{months.length || '…'}</b><span>{months.length ? `meses de datos, de ${months[0].label.toLowerCase()} a ${months[months.length - 1].label.toLowerCase()}` : 'meses de datos'}</span></div>
              <div><b>{dataState === 'loading' ? '…' : fmtK(total)}</b><span>{ds.source.kind === 'real' ? 'viajes entre barrios en un día laborable medio' : ds.source.kind === 'simulado' ? 'viajes simulados al día' : 'viajes importados al día'}</span></div>
            </motion.div>
          </div>
        </motion.section>
      )}
      {intro === 'flying' && (
        <motion.div key="cap" className="flight-caption" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 2.6, duration: 1.2 } }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
          <div className="display">Barcelona</div>
          <span className="num">41,39° N · 2,17° E · 101 km² · 1,66 M habitantes</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
