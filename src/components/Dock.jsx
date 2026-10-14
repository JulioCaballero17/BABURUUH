import { motion } from 'framer-motion'
import { Play, Pause, Sunrise, Sunset, Moon } from 'lucide-react'
import { useStore } from '../store.js'
import Timeline from './Timeline.jsx'
import { AnimatedNumber } from './ui/primitives.jsx'
import { dayName, dayDate, clockText, sunTimes, sunAt } from '../lib/week.js'
import { fmtK, pct } from '../lib/format.js'

const SPEEDS = [{ v: 0.5, l: '½×' }, { v: 1.5, l: '1×' }, { v: 5, l: '4×' }]
const hm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`

function Clock() {
  const t5 = useStore((s) => Math.floor(s.t * 12) / 12)
  const d = Math.floor(t5 / 24)
  const sun = sunAt(t5)
  const st = sunTimes(d)
  const h = t5 % 24
  const meta = sun.nightness > 0.5
    ? (h < 12 ? { I: Sunrise, txt: `Amanece a las ${hm(st.sunrise)}` } : { I: Moon, txt: `Noche · puesta a las ${hm(st.sunset)}` })
    : { I: Sunset, txt: `Puesta de sol a las ${hm(st.sunset)}` }
  return (
    <div className="clock" aria-live="off">
      <div className="day">{dayName(t5)} {dayDate(d)}</div>
      <div className="time">{clockText(t5)}</div>
      <div className="meta"><meta.I /> {meta.txt}</div>
    </div>
  )
}

function Kpis() {
  const tq = useStore((s) => Math.floor(s.t * 8) / 8)
  const ds = useStore((s) => s.dataset)
  const t0 = Math.floor(tq) % 120
  const t1 = (t0 + 1) % 120
  const f = tq - Math.floor(tq)
  const moving = ds.MOV[t0] * (1 - f) + ds.MOV[t1] * f
  let st = 0
  let dep = 0
  for (let i = 0; i < 73; i++) { st += ds.STAY[t0][i]; dep += ds.DEP[t0][i] }
  return (
    <>
      <div className="mini-kpi">
        <AnimatedNumber className="v" value={moving} format={fmtK} />
        <span className="l">personas cambiando de barrio por hora</span>
      </div>
      <div className="mini-kpi extra">
        <AnimatedNumber className="v" value={dep ? st / dep : 0} format={(v) => pct(v)} />
        <span className="l">de los viajes no salen del barrio</span>
      </div>
    </>
  )
}

export default function Dock() {
  const playing = useStore((s) => s.playing)
  const togglePlay = useStore((s) => s.togglePlay)
  const speed = useStore((s) => s.speed)
  const setSpeed = useStore((s) => s.setSpeed)
  return (
    <motion.div className="dock glass" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 150, damping: 22, delay: 0.15 }}>
      <div className="dock-left">
        <button className="play-btn" onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir la semana'} title="Reproducir / pausar (espacio)">
          {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" style={{ marginLeft: 2 }} />}
        </button>
        <div className="speed" role="radiogroup" aria-label="Velocidad">
          {SPEEDS.map((o) => <button key={o.v} role="radio" aria-checked={speed === o.v} aria-pressed={speed === o.v} onClick={() => setSpeed(o.v)}>{o.l}</button>)}
        </div>
        <Clock />
      </div>
      <Timeline />
      <div className="dock-right"><Kpis /></div>
    </motion.div>
  )
}
