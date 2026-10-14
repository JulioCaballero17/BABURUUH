// Guided chapters. Each one sets time, layers, colour mode and camera, and writes its text from the data.
import { BARRIOS, N } from '../model/geo.js'
import { OFFICE_22 } from '../data/attributes.js'
import { fmt, pct } from './format.js'
import { DAYS } from './colors.js'

const topArrival = (ds, t) => {
  const a = ds.ARR[Math.floor(t)]
  let best = 0
  for (let i = 1; i < N; i++) if (a[i] > a[best]) best = i
  return best
}
const fromOutside = (ds, t, i) => {
  const Ft = ds.F[Math.floor(t)]
  let tot = 0
  let other = 0
  for (let j = 0; j < N; j++) { const v = Ft[j * N + i]; tot += v; if (BARRIOS[j].dist !== BARRIOS[i].dist) other += v }
  return tot ? other / tot : 0
}

export function buildChapters(ds) {
  const ch = []
  const t1 = 8.25
  const a1 = topArrival(ds, t1)
  ch.push({
    id: 'despertar',
    title: 'La ciudad se despierta',
    t: t1,
    sel: -1,
    colorMode: 'activity',
    layers: { flows: true, barrios: '3d', hex: false, bubbles: false },
    cam: { center: [2.163, 41.392], zoom: 12.35, pitch: 58, bearing: -24 },
    body: `Lunes, 8:15. En una sola hora, **${fmt(ds.MOV[8])} personas** cambian de barrio. Las columnas más altas marcan dónde se concentra la llegada: hoy gana **${BARRIOS[a1].name}**.`,
  })

  const office = ds.metrics.some((m) => m.i === OFFICE_22) ? OFFICE_22 : [...ds.metrics].sort((a, b) => b.dayA - a.dayA)[0].i
  const t2 = 24 + 9.5
  ch.push({
    id: 'oficinas',
    title: 'El imán de las oficinas',
    t: t2,
    sel: office,
    colorMode: 'influence',
    influenceDir: 'in',
    layers: { flows: true, barrios: '3d', arcs: true },
    cam: { center: BARRIOS[office].c, zoom: 13.1, pitch: 62, bearing: -60 },
    body: `Martes, 9:30. **${BARRIOS[office].name}** se llena de gente que no vive allí: el **${pct(fromOutside(ds, t2, office))}** de quien llega viene de otro distrito. El color muestra de dónde sale.`,
  })

  const ev = ds.metrics.find((m) => m.tag.label === 'Noche de evento')
  if (ev) {
    ch.push({
      id: 'evento',
      title: 'Noche de partido',
      t: ev.peak,
      sel: ev.i,
      colorMode: 'influence',
      influenceDir: 'in',
      layers: { flows: true, arcs: true, barrios: '3d' },
      cam: { center: BARRIOS[ev.i].c, zoom: 12.9, pitch: 66, bearing: 30 },
      body: `${DAYS[Math.floor(ev.peak / 24)].name}, ${String(ev.peak % 24).padStart(2, '0')}:00. Un evento convierte **${BARRIOS[ev.i].name}** en el barrio más visitado de la ciudad: **${fmt(ds.ARR[ev.peak][ev.i])} llegadas** en una hora, desde todos los distritos.`,
    })
  }

  const thu = [...ds.metrics].filter((m) => ds.pop[m.i] >= 5).sort((a, b) => b.thuE - a.thuE)[0]
  ch.push({
    id: 'jueves',
    title: 'Jueves universitario',
    t: 3 * 24 + 23.25,
    sel: -1,
    colorMode: 'delta',
    deltaBase: 2,
    layers: { hex: true, flows: true, barrios: '3d' },
    cam: { center: BARRIOS[thu.i].c, zoom: 13, pitch: 60, bearing: 20 },
    body: `Jueves, 23:15, comparado con el miércoles a la misma hora. Los tonos rosados crecen; **${BARRIOS[thu.i].name}** recibe un **${Math.round((thu.thuE - 1) * 100)} % más** de gente que la noche anterior.`,
  })

  ch.push({
    id: 'viernes',
    title: 'Viernes: la burbuja se abre',
    t: 4 * 24 + 22.5,
    sel: -1,
    colorMode: 'bubble',
    layers: { bubbles: true, hex: false, flows: true, barrios: '2d' },
    cam: { center: [2.165, 41.392], zoom: 12.2, pitch: 64, bearing: -36 },
    body: `De 20 a 24 h, el lunes el **${pct(ds.cityBub[0])}** de los viajes no sale del barrio. El viernes baja al **${pct(ds.cityBub[4])}**: la ciudad se mezcla. Cada globo flota más alto cuanto más cerrado es su barrio.`,
  })

  const r = ds.regression[4].r
  ch.push({
    id: 'hipotesis',
    title: 'La hipótesis',
    t: 4 * 24 + 22,
    sel: -1,
    colorMode: 'bubble',
    panel: 'estudio',
    layers: { bubbles: false, barrios: '3d', flows: false },
    cam: { center: [2.17, 41.392], zoom: 12.3, pitch: 50, bearing: -20 },
    body: `¿Más restaurantes significan que la gente sale menos de su barrio? Con estos datos, el viernes por la noche la correlación es **r = ${r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}**. El panel de la izquierda lo muestra barrio a barrio.`,
  })

  ch.push({
    id: 'turno',
    title: 'Ahora, vuestros datos',
    t: 4 * 24 + 22,
    sel: -1,
    colorMode: 'activity',
    panel: 'datos',
    layers: { bubbles: false, flows: true, barrios: '3d' },
    cam: { center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 },
    body: ds.source.kind === 'simulado'
      ? 'Todo lo que has visto sale de un modelo simulado. Arrastra el CSV real al panel Datos y el mapa, los rankings y la hipótesis se recalculan al momento.'
      : 'Estás viendo los datos que has importado. Puedes volver a los simulados desde el panel Datos cuando quieras.',
  })
  return ch
}
