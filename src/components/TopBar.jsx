import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Camera, Link2, SunMoon, Sun, Moon, CircleHelp, Wind, Droplets } from 'lucide-react'
import { useStore } from '../store.js'
import DayPicker from './DayPicker.jsx'
import { BrandMark, WeatherIcon } from './ui/primitives.jsx'
import { capturePNG } from '../engine/mapEngine.js'
import { weatherText } from '../lib/apis.js'
import { DAYS } from '../lib/colors.js'
import { dayDate, dayName, clockText, dateFor } from '../lib/week.js'
import { legendFor, MODES } from '../lib/legend.js'

function WeatherChip() {
  const weather = useStore((s) => s.weather)
  const state = useStore((s) => s.weatherState)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  if (state === 'error') return null
  const cur = weather?.current
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="weather-chip" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Tiempo en Barcelona esta semana" disabled={!cur}>
        {cur ? (<><WeatherIcon code={cur.code} /> <b>{Math.round(cur.temp)}°</b> <span className="hide-m">ahora</span></>) : <span>…</span>}
      </button>
      <AnimatePresence>
        {open && cur && (
          <motion.div className="popover glass" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
            <p className="eyebrow">Barcelona · ahora mismo</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <WeatherIcon code={cur.code} width={34} height={34} />
              <div>
                <div className="serif" style={{ fontSize: 34, lineHeight: 1 }}>{Math.round(cur.temp)}°</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{weatherText(cur.code)}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'grid', gap: 4, fontSize: 12, color: 'var(--ink-2)' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Wind width={14} height={14} /> {Math.round(cur.wind)} km/h</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Droplets width={14} height={14} /> {Math.round(cur.humidity)} %</span>
              </div>
            </div>
            <div className="wx-days">
              {weather.days.map((d, k) => (
                <div key={d.date} className="wx-day" style={{ '--hue': DAYS[k].hue }}>
                  <span className="l">{DAYS[k].key}</span>
                  <WeatherIcon code={d.code} />
                  <span className="mx">{Math.round(d.max)}°</span>
                  <span className="mn">{Math.round(d.min)}° · {d.rain ?? 0} %</span>
                </div>
              ))}
            </div>
            <p className="note" style={{ marginTop: 12 }}>Previsión real de Open-Meteo para la semana que se muestra en el mapa. Útil para cruzar lluvia y movilidad.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TopBar() {
  const setCmdk = useStore((s) => s.setCmdk)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)
  const setHelp = useStore((s) => s.setHelp)
  const toast = useStore((s) => s.toast)
  const source = useStore((s) => s.dataset.source)

  const cycleTheme = () => {
    const next = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto'
    setTheme(next)
    toast(next === 'auto' ? 'El tema sigue al sol de la hora seleccionada.' : next === 'light' ? 'Tema claro fijado.' : 'Tema oscuro fijado.')
  }
  const capture = async () => {
    const s = useStore.getState()
    const lg = legendFor(s)
    const url = await capturePNG({
      title: `${dayName(s.t)} ${dayDate(Math.floor(s.t / 24))}, ${clockText(s.t)}`,
      subtitle: `Pulso de Barcelona · ${MODES[s.colorMode].label}${s.sel >= 0 ? ' · barrio seleccionado' : ''}`,
      legend: lg,
    })
    if (!url) return
    const a = document.createElement('a')
    const d = dateFor(s.t)
    a.download = `pulso-bcn-${d.toISOString().slice(0, 10)}-${clockText(s.t).replace(':', 'h')}.png`
    a.href = url
    a.click()
    toast('Captura descargada.')
  }
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Enlace copiado: abre exactamente esta vista.')
    } catch {
      toast('No se pudo copiar. Copia la dirección del navegador.', 'info')
    }
  }
  const ThemeIcon = theme === 'auto' ? SunMoon : theme === 'light' ? Sun : Moon

  return (
    <motion.header className="topbar" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.1 }}>
      <div className="brand glass">
        <BrandMark />
        <div className="brand-text">
          <div className="brand-name">Pulso <em>de Barcelona</em></div>
          <div className="brand-meta"><span className="dot live" /> {source.label}</div>
        </div>
      </div>
      <DayPicker />
      <div className="actions glass">
        <button className="search-btn" onClick={() => setCmdk(true)} aria-label="Buscar barrio o acción">
          <Search /> <span className="lbl">Buscar barrio o acción</span> <span className="kbd">Ctrl K</span>
        </button>
        <WeatherChip />
        <span className="divider-v" />
        <button className="icon-btn hide-m" onClick={capture} aria-label="Descargar captura del mapa" title="Descargar captura (P)"><Camera /></button>
        <button className="icon-btn hide-m" onClick={share} aria-label="Copiar enlace a esta vista" title="Copiar enlace a esta vista"><Link2 /></button>
        <button className="icon-btn" onClick={cycleTheme} aria-label={`Tema: ${theme === 'auto' ? 'automático' : theme === 'light' ? 'claro' : 'oscuro'}`} title="Tema: automático, claro u oscuro"><ThemeIcon /></button>
        <button className="icon-btn hide-m" onClick={() => setHelp(true)} aria-label="Atajos y ayuda" title="Atajos (?)"><CircleHelp /></button>
      </div>
    </motion.header>
  )
}
