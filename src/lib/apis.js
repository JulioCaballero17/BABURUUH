// Live data sources. Both are public, keyless APIs.
import { MONDAY, BCN } from './week.js'

// ---- Weather: Open-Meteo (https://open-meteo.com) ----
const WMO = {
  0: ['Despejado', 'sun'], 1: ['Casi despejado', 'sun'], 2: ['Intervalos de nubes', 'cloud-sun'], 3: ['Nublado', 'cloud'],
  45: ['Niebla', 'fog'], 48: ['Niebla', 'fog'], 51: ['Llovizna', 'drizzle'], 53: ['Llovizna', 'drizzle'], 55: ['Llovizna', 'drizzle'],
  61: ['Lluvia débil', 'rain'], 63: ['Lluvia', 'rain'], 65: ['Lluvia fuerte', 'rain'], 66: ['Lluvia helada', 'rain'], 67: ['Lluvia helada', 'rain'],
  71: ['Nieve', 'snow'], 73: ['Nieve', 'snow'], 75: ['Nieve', 'snow'], 80: ['Chubascos', 'rain'], 81: ['Chubascos', 'rain'], 82: ['Chubascos fuertes', 'rain'],
  95: ['Tormenta', 'storm'], 96: ['Tormenta', 'storm'], 99: ['Tormenta', 'storm'],
}
export const weatherText = (code) => (WMO[code] || ['—', 'cloud'])[0]
export const weatherIcon = (code) => (WMO[code] || ['—', 'cloud'])[1]

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export async function fetchWeather() {
  const start = new Date(MONDAY)
  const end = new Date(MONDAY)
  end.setDate(end.getDate() + 4)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${BCN.lat}&longitude=${BCN.lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Europe%2FMadrid&start_date=${iso(start)}&end_date=${iso(end)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`)
  const j = await res.json()
  const days = (j.daily?.time || []).slice(0, 5).map((t, k) => ({
    date: t,
    code: j.daily.weather_code[k],
    max: j.daily.temperature_2m_max[k],
    min: j.daily.temperature_2m_min[k],
    rain: j.daily.precipitation_probability_max?.[k] ?? null,
  }))
  const hourly = (j.hourly?.time || []).slice(0, 120).map((t, k) => ({
    temp: j.hourly.temperature_2m[k],
    code: j.hourly.weather_code[k],
    rain: j.hourly.precipitation_probability?.[k] ?? null,
  }))
  return {
    current: j.current ? { temp: j.current.temperature_2m, code: j.current.weather_code, wind: j.current.wind_speed_10m, humidity: j.current.relative_humidity_2m, isDay: j.current.is_day } : null,
    days,
    hourly,
    fetchedAt: Date.now(),
  }
}

// ---- Bicing: CityBikes API (https://api.citybik.es), proxied in dev to avoid CORS issues ----
export async function fetchBicing() {
  const tryUrl = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(String(r.status))
    return r.json()
  }
  let j
  try {
    j = await tryUrl('/api/citybikes/v2/networks/bicing')
  } catch {
    j = await tryUrl('https://api.citybik.es/v2/networks/bicing')
  }
  const stations = (j.network?.stations || []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.latitude,
    lng: s.longitude,
    bikes: s.free_bikes ?? 0,
    slots: s.empty_slots ?? 0,
    ebikes: s.extra?.ebikes ?? null,
  }))
  const total = stations.reduce((a, s) => a + s.bikes, 0)
  const docks = stations.reduce((a, s) => a + s.slots, 0)
  return {
    stations,
    total,
    docks,
    fetchedAt: Date.now(),
    geojson: {
      type: 'FeatureCollection',
      features: stations.map((s) => ({
        type: 'Feature',
        properties: { name: s.name, bikes: s.bikes, slots: s.slots, ratio: s.bikes + s.slots ? s.bikes / (s.bikes + s.slots) : 0, cap: s.bikes + s.slots },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      })),
    },
  }
}
