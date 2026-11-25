import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../store.js'
import { startIntro, skipIntro } from '../engine/mapEngine.js'

export default function Intro() {
  const intro = useStore((s) => s.intro)

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
            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.3, type: 'spring', stiffness: 120, damping: 20 } }}>
              Baburu
              <span>Cómo se mueve Barcelona, barrio a barrio.</span>
            </motion.h1>
            <motion.div className="intro-cta" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.8 } }}>
              <button className="go" onClick={startIntro} autoFocus>
                Entrar <ArrowRight />
              </button>
              <button className="skip" onClick={skipIntro}>Saltar animación</button>
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
