// "Nácar" palette: mineral, pearlescent hues of equal weight, one per weekday.
// They are deliberately desaturated so they sit on satellite imagery like ceramic glaze, not neon.
export const DAYS = [
  { key: 'L', name: 'Lunes', short: 'Lun', hue: '#5FBFAE', hueLight: '#2E8F80', glaze: 'Verdigris' },
  { key: 'M', name: 'Martes', short: 'Mar', hue: '#8EA2EA', hueLight: '#4F66C2', glaze: 'Pervinca' },
  { key: 'X', name: 'Miércoles', short: 'Mié', hue: '#E2C08A', hueLight: '#A57B2E', glaze: 'Champán' },
  { key: 'J', name: 'Jueves', short: 'Jue', hue: '#E79A84', hueLight: '#B85A42', glaze: 'Albaricoque' },
  { key: 'V', name: 'Viernes', short: 'Vie', hue: '#C985B6', hueLight: '#9A4D86', glaze: 'Orquídea' },
]

export const hexToRgb = (h) => {
  const n = h.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const rgbStr = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`

// Sequential ramp for activity: deep lagoon → verdigris → sand → rosé → plum.
export const RAMP_ACTIVITY = ['#123A45', '#25707A', '#5FBFAE', '#E6D5A9', '#E59A86', '#B4568B']
// Diverging ramp for day-vs-day differences: periwinkle (less) ↔ bone ↔ rosewood (more).
export const RAMP_DELTA = ['#4E64C4', '#8EA2EA', '#E9E5DC', '#E59A86', '#B44663']
// Bubble (self-containment): open = bone, closed = deep verdigris.
export const RAMP_BUBBLE = ['#F1ECE1', '#CFE3D8', '#8CCBBE', '#4FA69A', '#25726D', '#13454A']
// Influence (share of one barrio's trips): transparent bone → champagne → orchid.
export const RAMP_INFLUENCE = ['#2A3442', '#5D6E86', '#E2C08A', '#E59A86', '#C985B6']

export const rampStops = (ramp, min = 0, max = 1) =>
  ramp.flatMap((c, i) => [min + ((max - min) * i) / (ramp.length - 1), c])

export const rampAt = (ramp, v) => {
  const x = Math.max(0, Math.min(1, v)) * (ramp.length - 1)
  const k = Math.min(ramp.length - 2, Math.floor(x))
  return mix(hexToRgb(ramp[k]), hexToRgb(ramp[k + 1]), x - k)
}

// One colour per district, drawn from the same mineral family (used in chord + scatter).
export const DISTRICT_COLORS = ['#000000', '#C985B6', '#E2C08A', '#E79A84', '#8EA2EA', '#5FBFAE', '#D7A6C9', '#9BC7A0', '#7FA7C9', '#C9B38A', '#A39BD9']

export const hueForTime = (t) => {
  const d = Math.floor(((t % 120) + 120) % 120 / 24)
  const h = t % 24
  const next = d === 4 ? 4 : d + 1
  const w = h > 23 ? (h - 23) : 0
  const s = w * w * (3 - 2 * w)
  return mix(hexToRgb(DAYS[d].hue), hexToRgb(DAYS[next].hue), s)
}
