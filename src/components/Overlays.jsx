import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Info } from 'lucide-react'
import { useStore } from '../store.js'

const SHORTCUTS = [
  ['Espacio', 'Reproducir o pausar la semana'],
  ['1 – 5', 'Ir de lunes a viernes (misma hora)'],
  ['← →', 'Avanzar o retroceder una hora'],
  ['Ctrl K  ·  /', 'Buscar barrio o acción'],
  ['L B R G S I', 'Paneles: capas, burbujas, ranking, distritos, historias, datos'],
  ['D', 'Comparar con el lunes'],
  ['O', 'Órbita automática de la cámara'],
  ['H', 'Volver a la vista inicial'],
  ['P', 'Descargar una captura'],
  ['C', 'Comparar el barrio seleccionado'],
  ['Esc', 'Cerrar lo que esté abierto'],
]

export function HelpOverlay() {
  const open = useStore((s) => s.help)
  const setHelp = useStore((s) => s.setHelp)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="s" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelp(false)} />
          <motion.div key="m" className="modal glass" role="dialog" aria-modal="true" aria-label="Atajos de teclado" style={{ width: 'min(560px, calc(100vw - 32px))' }} initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }} transition={{ type: 'spring', stiffness: 320, damping: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow">Ayuda</p>
                <h2 className="serif" style={{ margin: '4px 0 0', fontSize: 34, lineHeight: 1 }}>Atajos de teclado</h2>
              </div>
              <button className="icon-btn" onClick={() => setHelp(false)} aria-label="Cerrar ayuda"><X /></button>
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px', margin: '20px 0 0' }}>
              {SHORTCUTS.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt><span className="kbd" style={{ fontSize: 12, padding: '2px 8px' }}>{k}</span></dt>
                  <dd style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13.5 }}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="note" style={{ marginTop: 18 }}>Ratón: arrastra para mover, clic derecho o Ctrl + arrastrar para girar e inclinar, rueda para acercar. Haz clic en un barrio para abrir su ficha.</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} className="toast glass" layout initial={{ opacity: 0, y: -12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
            {t.kind === 'info' ? <Info /> : <Check />} {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
