import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store.js'
import { startIntro, skipIntro } from '../engine/mapEngine.js'
import { fmtK } from '../lib/format.js'

export default function Intro() {
  const intro = useStore((s) => s.intro)
  const ds = useStore((s) => s.dataset)
  const total = ds.DAYTOT.reduce((a, b) => a + b, 0)

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
              Observatorio de movilidad · 73 barrios · lunes a viernes
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.45, type: 'spring', stiffness: 120, damping: 20 } }}>
              Pulso de <em>Barcelona</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.8 } }}>
              Cómo se mueve la ciudad durante la semana laboral: de dónde sale la gente, adónde va a cada hora y qué barrios funcionan como burbujas.
            </motion.p>
            <motion.div className="intro-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}>
              <button className="go" onClick={startIntro} autoFocus>
                Entrar en la ciudad <ArrowRight />
              </button>
              <button className="skip" onClick={skipIntro}>Saltar animación</button>
            </motion.div>
            <motion.div className="intro-stats" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.25 } }}>
              <div><b>73</b><span>barrios</span></div>
              <div><b>120</b><span>horas, de lunes a viernes</span></div>
              <div><b>{fmtK(total)}</b><span>desplazamientos {ds.source.kind === 'simulado' ? 'simulados' : 'importados'}</span></div>
            </motion.div>
          </div>
        </motion.section>
      )}
      {intro === 'flying' && (
        <motion.div key="cap" className="flight-caption" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: 2.6, duration: 1.2 } }} exit={{ opacity: 0, transition: { duration: 0.6 } }}>
          <div className="serif">Barcelona</div>
          <span className="num">41,39° N · 2,17° E · 101 km² · 1,66 M habitantes</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
