// Guided chapters. Each one sets the day, layers, colour mode and camera, and writes its text from the data.
import { BARRIOS, N } from '../model/geo.js'
import { fmt, pct } from './format.js'
import { DAYS } from './colors.js'

const topArrival = (ds, d) => {
  const a = ds.ARR[d]
  let best = 0
  for (let i = 1; i < N; i++) if (a[i] - ds.STAY[d][i] > a[best] - ds.STAY[d][best]) best = i
  return best
}
const fromOutside = (ds, d, i) => {
  const Ft = ds.F[d]
  let tot = 0
  let other = 0
  for (let j = 0; j < N; j++) { const v = Ft[j * N + i]; tot += v; if (BARRIOS[j].dist !== BARRIOS[i].dist) other += v }
  return tot ? other / tot : 0
}
const dn = (d) => DAYS[d].name.toLowerCase()

export function buildChapters(ds) {
  const ch = []
  const periodTxt = ds.source.kind === 'real' ? ` (${ds.source.period.toLowerCase()}, ${segmentTxt(ds.source.segment)})` : ''
  const a1 = topArrival(ds, 0)
  ch.push({
    id: 'despertar',
    title: 'Un lunes cualquiera',
    t: 0,
    sel: -1,
    colorMode: 'activity',
    layers: { flows: true, barrios: '3d', hex: false, bubbles: false },
    cam: { center: [2.163, 41.392], zoom: 12.35, pitch: 58, bearing: -24 },
    body: `Un lunes medio${periodTxt}, **${fmt(ds.MOV[0])} viajes** cruzan de un barrio a otro. Las columnas más altas marcan dónde se concentra la llegada: el que más visitantes recibe es **${BARRIOS[a1].name}**.`,
  })

  const elig = ds.metrics.filter((m) => ds.pop[m.i] >= 5 && m.weekArr > 0)
  const mag = [...elig].sort((a, b) => b.visitorsPerRes - a.visitorsPerRes)[0] || ds.metrics[0]
  ch.push({
    id: 'iman',
    title: 'El gran imán',
    t: 1,
    sel: mag.i,
    colorMode: 'influence',
    influenceDir: 'in',
    layers: { flows: true, barrios: '3d', arcs: true },
    cam: { center: BARRIOS[mag.i].c, zoom: 13.1, pitch: 62, bearing: -60 },
    body: `**${BARRIOS[mag.i].name}** recibe cada día **${mag.visitorsPerRes.toLocaleString('es-ES', { maximumFractionDigits: 1 })} visitantes por vecino**. El martes, el **${pct(fromOutside(ds, 1, mag.i))}** de quien llega viene de otro distrito. El color muestra de dónde sale.`,
  })

  const pk = [...elig].sort((a, b) => b.peakE - a.peakE)[0]
  if (pk && pk.peakE > 1.1) {
    ch.push({
      id: 'pico',
      title: 'El día que cambia todo',
      t: pk.peak,
      sel: pk.i,
      colorMode: 'delta',
      deltaBase: pk.peak === 0 ? 1 : 0,
      layers: { flows: true, arcs: true, barrios: '3d' },
      cam: { center: BARRIOS[pk.i].c, zoom: 12.9, pitch: 66, bearing: 30 },
      body: `El ${dn(pk.peak)}, **${BARRIOS[pk.i].name}** recibe un **${Math.round((pk.peakE - 1) * 100)} % más** de gente que su media de lunes a viernes. El color compara cada barrio con el ${dn(pk.peak === 0 ? 1 : 0)}.`,
    })
  }

  const fri = [...elig].sort((a, b) => b.friE - a.friE)[0]
  ch.push({
    id: 'viernes',
    title: 'Llega el viernes',
    t: 4,
    sel: -1,
    colorMode: 'delta',
    deltaBase: 0,
    layers: { hex: true, flows: true, barrios: '3d' },
    cam: { center: BARRIOS[fri.i].c, zoom: 13, pitch: 60, bearing: 20 },
    body: `Viernes comparado con el lunes. Los tonos rosados crecen y los azules bajan. **${BARRIOS[fri.i].name}** es el que más gana: **${fri.friE >= 1 ? '+' : '−'}${Math.abs(Math.round((fri.friE - 1) * 100))} %** de llegadas.`,
  })

  const hi = ds.cityBub.indexOf(Math.max(...ds.cityBub))
  const lo = ds.cityBub.indexOf(Math.min(...ds.cityBub))
  if (ds.hasStays) ch.push({
    id: 'burbuja',
    title: 'La burbuja de cada día',
    t: lo,
    sel: -1,
    colorMode: 'bubble',
    layers: { bubbles: true, hex: false, flows: true, barrios: '2d' },
    cam: { center: [2.165, 41.392], zoom: 12.2, pitch: 64, bearing: -36 },
    body: `El ${dn(hi)} el **${pct(ds.cityBub[hi])}** de los viajes no sale del barrio donde empieza; el ${dn(lo)} baja al **${pct(ds.cityBub[lo])}**. Cada globo flota más alto cuanto más cerrado es su barrio.`,
  })

  const r = ds.regressionWeek.r
  if (ds.hasStays) ch.push({
    id: 'hipotesis',
    title: 'La hipótesis',
    t: 4,
    sel: -1,
    colorMode: 'bubble',
    panel: 'estudio',
    layers: { bubbles: false, barrios: '3d', flows: false },
    cam: { center: [2.17, 41.392], zoom: 12.3, pitch: 50, bearing: -20 },
    body: `¿Más restaurantes significan que la gente sale menos de su barrio? Con la burbuja media de lunes a viernes, la correlación es **r = ${r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}**. El panel de la izquierda lo muestra barrio a barrio.`,
  })

  ch.push({
    id: 'turno',
    title: 'Explora otros periodos',
    t: 2,
    sel: -1,
    colorMode: 'activity',
    panel: 'datos',
    layers: { bubbles: false, flows: true, barrios: '3d' },
    cam: { center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 },
    body: ds.source.kind === 'real'
      ? 'En el panel Datos puedes cambiar de mes o de año y mirar solo a los residentes o a los visitantes: el mapa, los rankings y la hipótesis se recalculan al momento.'
      : 'Estás viendo datos simulados o importados. Desde el panel Datos puedes volver a los datos reales y elegir el periodo.',
  })
  return ch
}

function segmentTxt(s) {
  return { all: 'todos los viajeros', Residente: 'residentes', Regional: 'visitantes de Cataluña', Nacional: 'visitantes del resto de España', Internacional: 'visitantes internacionales' }[s] || s
}
