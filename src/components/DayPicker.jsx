import { motion } from 'framer-motion'
import { useStore, selectDark } from '../store.js'
import { DAYS, hexToRgb } from '../lib/colors.js'
import { dayOf } from '../lib/week.js'
import { fmtK } from '../lib/format.js'

export default function DayPicker() {
  const day = useStore((s) => dayOf(s.t))
  const dark = useStore(selectDark)
  const goDay = useStore((s) => s.goDay)
  const ds = useStore((s) => s.dataset)

  return (
    <nav className="daypicker glass" aria-label="Día de la semana">
      {DAYS.map((d, k) => {
        const hue = dark ? d.hue : d.hueLight
        const active = k === day
        return (
          <button
            key={d.key}
            className="day-btn"
            style={{ '--hue': hue, '--active-rgb': hexToRgb(hue).join(',') }}
            aria-pressed={active}
            aria-label={`${d.name}: ${fmtK(ds.MOV[k])} viajes entre barrios`}
            onClick={() => goDay(k)}
            title={`${d.name} · tecla ${k + 1}`}
          >
            {active && <motion.span layoutId="day-active" className="day-active" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span className="letter">{d.key}</span>
            <span className="dname">{d.name}</span>
            <span className="ddate">{fmtK(ds.MOV[k])}</span>
          </button>
        )
      })}
    </nav>
  )
}
