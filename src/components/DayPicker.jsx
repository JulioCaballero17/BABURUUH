import { motion } from 'framer-motion'
import { useStore, selectDark } from '../store.js'
import { DAYS, hexToRgb } from '../lib/colors.js'
import { dayDate, dayOf } from '../lib/week.js'
import { WeatherIcon } from './ui/primitives.jsx'

export default function DayPicker() {
  const day = useStore((s) => dayOf(s.t))
  const prog = useStore((s) => Math.floor((s.t % 24) * 4) / 96)
  const dark = useStore(selectDark)
  const goDay = useStore((s) => s.goDay)
  const weather = useStore((s) => s.weather)

  return (
    <nav className="daypicker glass" aria-label="Día de la semana">
      {DAYS.map((d, k) => {
        const hue = dark ? d.hue : d.hueLight
        const wx = weather?.days?.[k]
        const active = k === day
        return (
          <button
            key={d.key}
            className="day-btn"
            style={{ '--hue': hue, '--active-rgb': hexToRgb(hue).join(',') }}
            aria-pressed={active}
            aria-label={`${d.name} ${dayDate(k)}`}
            onClick={() => goDay(k)}
            title={`${d.name} · tecla ${k + 1}`}
          >
            {active && <motion.span layoutId="day-active" className="day-active" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span className="letter">{d.key}</span>
            <span className="dname">{d.name}</span>
            <span className="ddate">
              {dayDate(k)}
              {wx && (<><WeatherIcon code={wx.code} /><span className="t">{Math.round(wx.max)}°</span></>)}
            </span>
            {active && <span className="day-progress"><i style={{ width: `${prog * 100}%` }} /></span>}
          </button>
        )
      })}
    </nav>
  )
}
