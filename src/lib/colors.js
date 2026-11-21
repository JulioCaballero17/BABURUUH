// "Plano de Barcelona" palette.
// The interface is black and yellow like the city's taxis: asphalt ink, cool paper, and one accent,
// taxi yellow. The weekdays are stations on one line, so they share that single accent instead of
// having a colour each.
export const ACCENT = '#FFC72C'
export const ACCENT_DEEP = '#C99400' // the accent when it has to read on light paper

export const DAYS = [
  { key: 'L', name: 'Lunes', short: 'Lun', hue: ACCENT, hueLight: ACCENT_DEEP },
  { key: 'M', name: 'Martes', short: 'Mar', hue: ACCENT, hueLight: ACCENT_DEEP },
  { key: 'X', name: 'Miércoles', short: 'Mié', hue: ACCENT, hueLight: ACCENT_DEEP },
  { key: 'J', name: 'Jueves', short: 'Jue', hue: ACCENT, hueLight: ACCENT_DEEP },
  { key: 'V', name: 'Viernes', short: 'Vie', hue: ACCENT, hueLight: ACCENT_DEEP },
]

export const hexToRgb = (h) => {
  const n = h.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const rgbStr = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`

// Activity: night blue → harbour teal → taxi yellow. The busiest barrios burn yellow.
export const RAMP_ACTIVITY = ['#1D2B45', '#24557A', '#2F8A9A', '#7FC2A5', '#E9DC7A', '#FFB81C']
// Differences (day vs day, period vs period): blue = less, grey = same, amber = more. Colour-blind safe.
export const RAMP_DELTA = ['#1F4FBF', '#7C9EE4', '#E6E7E4', '#F2C552', '#D98800']
// Bubble (self-containment): open = pale, closed = deep teal.
export const RAMP_BUBBLE = ['#EEF0EC', '#C9E0D6', '#8CC6B6', '#4C9F93', '#256F6B', '#13434A']
// Influence (share of one barrio's trips): asphalt → yellow.
export const RAMP_INFLUENCE = ['#2A2F37', '#4F5C6E', '#9AA7A0', '#F2D16B', '#FFB81C']
// Visitors (share of arrivals from outside Barcelona): residents' blue-grey → visitors' magenta.
export const RAMP_VISITORS = ['#2B3A55', '#4A5E8C', '#8A6DB4', '#D46A9F', '#FF8E8E']

export const rampStops = (ramp, min = 0, max = 1) =>
  ramp.flatMap((c, i) => [min + ((max - min) * i) / (ramp.length - 1), c])

export const rampAt = (ramp, v) => {
  const x = Math.max(0, Math.min(1, v)) * (ramp.length - 1)
  const k = Math.min(ramp.length - 2, Math.floor(x))
  return mix(hexToRgb(ramp[k]), hexToRgb(ramp[k + 1]), x - k)
}

// One colour per district (used in the chord diagram, the scatter and the ranking).
// Muted, evenly spaced hues that sit next to the yellow accent without competing with it.
export const DISTRICT_COLORS = ['#000000', '#5B8DEF', '#E4795B', '#4DB6A0', '#C77DD1', '#E8B04A', '#6FA8C9', '#D9607F', '#8BBF63', '#9C8CE0', '#B8946A']

// Traveller types, for composition bars.
export const SEGMENT_COLORS = { Residente: '#4A5E8C', Regional: '#2F8A9A', Nacional: '#E8B04A', Internacional: '#D46A9F' }
