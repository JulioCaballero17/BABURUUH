import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from 'lucide-react'
import { weatherIcon } from '../../lib/apis.js'

// Number that glides to its new value instead of snapping.
export function AnimatedNumber({ value, format = (v) => Math.round(v).toLocaleString('es-ES'), duration = 600, className }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    const b = value
    cancelAnimationFrame(raf.current)
    const step = (now) => {
      const e = Math.min(1, (now - start) / duration)
      const k = 1 - Math.pow(1 - e, 3)
      const v = a + (b - a) * k
      from.current = v
      setShown(v)
      if (e < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [value, duration])
  return <span className={className}>{format(shown)}</span>
}

export function Segmented({ options, value, onChange, label, id }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && <motion.i layoutId={`seg-${id}`} className="seg-thumb" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
}

const WX = { sun: Sun, 'cloud-sun': CloudSun, cloud: Cloud, fog: CloudFog, drizzle: CloudDrizzle, rain: CloudRain, snow: CloudSnow, storm: CloudLightning }
export function WeatherIcon({ code, ...rest }) {
  const C = WX[weatherIcon(code)] || Cloud
  return <C aria-hidden="true" {...rest} />
}

export function BrandMark({ size = 34 }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5FBFAE" />
          <stop offset=".3" stopColor="#8EA2EA" />
          <stop offset=".55" stopColor="#E2C08A" />
          <stop offset=".78" stopColor="#E79A84" />
          <stop offset="1" stopColor="#C985B6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="none" stroke="url(#bm)" strokeWidth="3" />
      <path d="M12 38h8l4-12 6 20 6-26 5 18h11" fill="none" stroke="url(#bm)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const panelMotion = {
  initial: { opacity: 0, x: -18 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 30 } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.12 } },
}
export const stagger = (i, base = 0.04) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { delay: i * base, type: 'spring', stiffness: 320, damping: 30 } },
})
