import { DAYS } from './colors.js'
import { STEPS } from '../model/simulate.js'

export const BCN = { lat: 41.3874, lng: 2.1686 }

// Monday of the current week (local time), used only for the live weather forecast.
export function currentMonday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const wd = d.getDay() // 0 Sunday
  const back = wd === 0 ? 6 : wd - 1
  d.setDate(d.getDate() - back)
  return d
}
export const MONDAY = currentMonday()

// Time in the app is a day position: 0 = Monday … 4 = Friday (fractional only while animating).
export const dayOf = (t) => ((Math.round(t) % STEPS) + STEPS) % STEPS
export const dayName = (t) => DAYS[dayOf(t)].name

// The data has no hours, so the map uses a fixed afternoon sun.
const FIXED_SUN = { altitude: 38, bearing: 215, nightness: 0 }
export const sunAt = () => FIXED_SUN
