import SunCalc from 'suncalc'
import { DAYS } from './colors.js'

export const BCN = { lat: 41.3874, lng: 2.1686 }

// Monday of the current week (local time). On weekends we show the week that just ended.
export function currentMonday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const wd = d.getDay() // 0 Sunday
  const back = wd === 0 ? 6 : wd - 1
  d.setDate(d.getDate() - back)
  return d
}
export const MONDAY = currentMonday()

export const dateFor = (t) => {
  const d = new Date(MONDAY)
  const day = Math.floor(t / 24)
  const h = t - day * 24
  d.setDate(d.getDate() + day)
  d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0)
  return d
}

const DATE_FMT = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
export const dayDate = (d) => DATE_FMT.format(dateFor(d * 24 + 12)).replace('.', '')

export const clockText = (t) => {
  const h = ((t % 24) + 24) % 24
  let H = Math.floor(h)
  let m = Math.floor(((h - H) * 60) / 5) * 5
  if (m >= 60) { H = (H + 1) % 24; m = 0 }
  return `${String(H).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
export const dayOf = (t) => Math.floor((((t % 120) + 120) % 120) / 24)
export const dayName = (t) => DAYS[dayOf(t)].name
export const periodOf = (t) => {
  const h = t % 24
  if (h < 6) return 'madrugada'
  if (h < 12) return 'mañana'
  if (h < 15) return 'mediodía'
  if (h < 20) return 'tarde'
  return 'noche'
}

// Real sun for Barcelona on that day and time.
export function sunAt(t) {
  const p = SunCalc.getPosition(dateFor(t), BCN.lat, BCN.lng)
  const altitude = (p.altitude * 180) / Math.PI
  const bearing = ((p.azimuth * 180) / Math.PI + 180 + 360) % 360
  // 0 = full day, 1 = full night (civil twilight blend)
  const x = Math.min(1, Math.max(0, (6 - altitude) / 14))
  const nightness = x * x * (3 - 2 * x)
  return { altitude, bearing, nightness }
}

export function sunTimes(day) {
  const s = SunCalc.getTimes(dateFor(day * 24 + 12), BCN.lat, BCN.lng)
  const toH = (d) => d.getHours() + d.getMinutes() / 60
  return { sunrise: toH(s.sunrise), sunset: toH(s.sunset) }
}

// Night bands for the whole week (used by the timeline background)
export const NIGHT_PROFILE = Array.from({ length: 120 * 4 }, (_, k) => sunAt(k / 4).nightness)
