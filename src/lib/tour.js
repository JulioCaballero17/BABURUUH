// The Tour: a guided walk through every feature of Baburu, built for presenting.
// Each step puts the app in a known state (day, panel, colour mode, layers, selected barrio, camera),
// lights up the control it talks about, and writes its text from the data that is loaded.
import { BARRIOS, N } from '../model/geo.js'
import { topFrom, visitorShares, periodRatio } from '../model/derive.js'
import { segmentLabel } from '../model/realData.js'
import { defaultCompare } from '../store.js'
import { fmt, fmtK, pct } from './format.js'
import { DAYS } from './colors.js'

const dn = (d) => DAYS[d].name.toLowerCase()
const HOME = { center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 }
const camOn = (i, extra = {}) => ({ center: BARRIOS[i].c, zoom: 13.2, pitch: 60, bearing: -30, ...extra })

// The state every step starts from, so any step can be opened directly.
export const BASE = {
  sel: -1,
  colorMode: 'activity',
  panel: null,
  compareOpen: false,
  cmdk: false,
  playing: false,
  layers: { flows: true, arcs: true, hex: false, bubbles: false, barrios: '3d', pulse: true },
}

export function buildTour(ds, st) {
  const real = ds.source.kind === 'real'
  const elig = ds.metrics.filter((m) => ds.pop[m.i] >= 5 && m.weekArr > 0)
  const byArr = [...elig].sort((a, b) => b.arr[1] - a.arr[1])
  const star = byArr[0]?.i ?? 0 // the barrio with most arrivals on Tuesday
  const dest = topFrom(ds, star, 1, 1)[0]?.j ?? (star + 1) % N
  let outTot = 0
  for (let j = 0; j < N; j++) if (j !== star) outTot += ds.F[1][star * N + j]
  const destV = ds.F[1][star * N + dest]
  const fri = [...elig].sort((a, b) => b.friE - a.friE)[0]
  const periodTxt = real ? ` (${ds.source.period.toLowerCase()})` : ''
  const months = st.periods.filter((p) => p.kind === 'month')

  // international visitors
  const intl = visitorShares(ds, 2, 'intl')
  let intlTop = -1
  if (intl) intlTop = [...elig].sort((a, b) => intl[b.i] - intl[a.i])[0]?.i ?? -1
  const vis = visitorShares(ds, 1, 'all')

  // monthly evolution of the star barrio
  let evoTxt = 'La línea muestra cómo cambian sus llegadas de un mes a otro.'
  if (st.summary) {
    const ms = st.summary.periods.filter((p) => p.kind === 'month')
    const names = st.segment === 'all' ? st.summary.segments : [st.segment]
    const vals = ms.map((p) => names.reduce((a, n) => a + (st.summary.arr[p.id]?.[n]?.[star] || 0), 0))
    const hi = vals.indexOf(Math.max(...vals))
    const lo = vals.indexOf(Math.min(...vals))
    if (ms.length) evoTxt = `Su mes más concurrido fue **${ms[hi].label.toLowerCase()}** (${fmtK(vals[hi])} llegadas por día) y el más tranquilo, **${ms[lo].label.toLowerCase()}** (${fmtK(vals[lo])}).`
  }

  // period comparison
  // With the whole series loaded, an August makes the contrast obvious (the city empties of commuters).
  const augusts = months.filter((p) => p.id.endsWith('-08'))
  const cmp = st.period === 'all' && augusts.length ? augusts[augusts.length - 1].id : defaultCompare(st.period, st.periods)
  const cmpLabel = st.periods.find((p) => p.id === cmp)?.label || 'otro periodo'
  let periodTxtCmp = `El color compara la media de lunes a viernes de este periodo con **${cmpLabel.toLowerCase()}**.`
  const pr = periodRatio(st.summary, ds.source.periodId, cmp, st.segment)
  if (pr) {
    let up = 0
    let best = -1
    let worst = -1
    const r = (i) => pr.cur[i] / pr.ref[i]
    for (let i = 0; i < N; i++) {
      if (pr.cur[i] > pr.ref[i]) up++
      if (pr.ref[i] < 500) continue
      if (best < 0 || r(i) > r(best)) best = i
      if (worst < 0 || r(i) < r(worst)) worst = i
    }
    const sp = (v) => `${v >= 1 ? '+' : '−'}${Math.abs(Math.round((v - 1) * 100))} %`
    if (best >= 0) periodTxtCmp = `Frente a **${cmpLabel.toLowerCase()}**, llega más gente a **${up} de los 73 barrios**. La diferencia mayor está en **${BARRIOS[best].name}** (${sp(r(best))}); en el otro extremo, **${BARRIOS[worst].name}** (${sp(r(worst))}).`
  }

  const steps = [
    {
      id: 'hola',
      title: 'Esto es Baburu',
      body: `Cada columna es un barrio de Barcelona. **Cuanto más alta y más amarilla, más gente llega** por km² ese día. Un martes medio${periodTxt} hay **${fmt(ds.MOV[1])} viajes** de un barrio a otro.`,
      hint: 'La leyenda de abajo a la derecha explica siempre qué significa el color.',
      target: 'legend', badge: 'Cómo leer el mapa', place: 'bottom-left',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'metro',
      title: 'La semana es una línea de metro',
      body: `Cada parada es un día laborable y encima tiene cuántos viajes hay. El ${byArr.length ? dn(ds.MOV.indexOf(Math.max(...ds.MOV))) : 'día'} es el que más se mueve. **Toca una parada** para cambiar de día: el mapa, los rankings y las fichas se actualizan.`,
      hint: 'Atajos: teclas 1 a 5, o las flechas fuera del tour.',
      target: 'metro', badge: 'Día de la semana', place: 'top-right',
      state: { t: ds.MOV.indexOf(Math.max(...ds.MOV)) }, cam: HOME,
    },
    {
      id: 'play',
      title: 'Reproduce la semana',
      body: 'Con el botón amarillo la semana avanza sola de lunes a viernes. Las columnas crecen y bajan y **las líneas amarillas son los 60 trayectos más fuertes de cada día**, animados.',
      hint: 'Espacio para reproducir o pausar. Puedes elegir velocidad ½×, 1× o 2×.',
      target: 'play', badge: 'Reproducir', place: 'top-right',
      state: { t: 0, playing: true }, cam: { center: [2.165, 41.392], zoom: 12.6, pitch: 62, bearing: -12 },
    },
    {
      id: 'periodo',
      title: 'Elige el periodo y quién viaja',
      body: real
        ? `Hay datos de **${months.length} meses**, de ${months[0]?.label.toLowerCase()} a ${months[months.length - 1]?.label.toLowerCase()}. Puedes ver un mes, un año o todo junto, y filtrar **residentes** o **visitantes** de Cataluña, de España o del extranjero.`
        : 'Aquí eliges el periodo y el tipo de viajero. Ahora mismo estás viendo datos importados o simulados.',
      hint: 'Ahora: ' + (real ? `${ds.source.period} · ${segmentLabel(st.segment).toLowerCase()}` : ds.source.label),
      target: 'dock-data', badge: 'Periodo y viajeros', place: 'top-right',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'ficha',
      title: 'Cada barrio tiene su ficha',
      body: `Haz clic en cualquier barrio. Este es **${BARRIOS[star].name}**, el que más gente recibe un martes: **${fmt(ds.ARR[1][star])} llegadas**. La ficha resume su día fuerte, su perfil y adónde va su gente.`,
      target: 'drawer', badge: 'Ficha del barrio', place: 'bottom-left',
      state: { t: 1, sel: star }, cam: camOn(star),
    },
    {
      id: 'evolucion',
      title: 'Cómo ha cambiado mes a mes',
      body: `${evoTxt} La franja amarilla marca el periodo que estás viendo, y **un clic en un mes lo carga**.`,
      target: 'drawer-evo', badge: 'Nuevo · Evolución', place: 'bottom-left', scroll: 'drawer-evo',
      state: { t: 1, sel: star }, cam: camOn(star), hidden: !real,
    },
    {
      id: 'quien',
      title: 'Quién llega a cada barrio',
      body: vis
        ? `En ${BARRIOS[star].short}, el **${pct(vis[star])}** de quien llega un martes no vive en Barcelona. La barra separa residentes y visitantes de Cataluña, de España y del extranjero.`
        : 'La barra separa residentes y visitantes de Cataluña, de España y del extranjero.',
      target: 'drawer-who', badge: 'Nuevo · Quién llega', place: 'bottom-left', scroll: 'drawer-who',
      state: { t: 1, sel: star }, cam: camOn(star), hidden: !ds.segArr,
    },
    {
      id: 'influencia',
      title: 'Adónde va su gente',
      body: `Con **Ver influencia**, los barrios se colorean según la parte de los viajes de ${BARRIOS[star].short} que reciben, y los arcos marcan sus 10 destinos principales. El primero es **${BARRIOS[dest].name}** (${pct(outTot ? destV / outTot : 0)}).`,
      target: 'drawer-influence', badge: 'Influencia', place: 'bottom-left',
      state: { t: 1, sel: star, colorMode: 'influence', influenceDir: 'out' }, cam: { ...camOn(star), zoom: 12.4, pitch: 50 },
    },
    {
      id: 'comparar',
      title: 'Compara dos barrios',
      body: `**Comparar** pone dos barrios lado a lado: llegadas de lunes a viernes, cifras clave y su «ADN». Aquí, ${BARRIOS[star].short} frente a ${BARRIOS[dest].short}. Puedes elegir el segundo barrio en el desplegable.`,
      target: 'compare', badge: 'Comparar', place: 'top-right',
      state: { t: 1, sel: star, compareOpen: true, compareB: dest }, cam: camOn(star),
    },
    {
      id: 'cambio-dias',
      title: 'Qué cambia de un día a otro',
      body: fri
        ? `El panel **Mapa** cambia lo que significa el color. Con **Cambio entre días**, el viernes se compara con el lunes: ámbar es más gente, azul es menos. **${BARRIOS[fri.i].name}** es el que más gana (${Math.round((fri.friE - 1) * 100)} %).`
        : 'Con Cambio entre días, cada barrio se compara con otro día: ámbar es más gente, azul es menos.',
      target: 'mode-delta', badge: 'Cambio entre días', place: 'top-right',
      state: { t: 4, panel: 'capas', colorMode: 'delta', deltaBase: 0 }, cam: fri ? camOn(fri.i, { zoom: 12.5, pitch: 55 }) : HOME,
    },
    {
      id: 'visitantes',
      title: 'Dónde llegan los visitantes',
      body: intlTop >= 0
        ? `**Visitantes** colorea cada barrio por la parte de su gente que viene de fuera. Con «Solo internacionales» salen los barrios más turísticos: en **${BARRIOS[intlTop].name}**, el **${pct(intl[intlTop])}** de quien llega viene del extranjero.`
        : 'Visitantes colorea cada barrio por la parte de su gente que viene de fuera de Barcelona.',
      target: 'mode-visitors', badge: 'Nuevo · Visitantes', place: 'top-right',
      state: { t: 2, panel: 'capas', colorMode: 'visitors', visitorKind: 'intl' }, cam: { center: [2.172, 41.39], zoom: 12.7, pitch: 55, bearing: -20 }, hidden: !ds.segArr,
    },
    {
      id: 'periodos',
      title: 'Compara dos periodos',
      body: `${periodTxtCmp} Ámbar es más gente que en el periodo de referencia; azul, menos.`,
      hint: 'El periodo de referencia se elige en el panel; el actual, en la barra inferior.',
      target: 'mode-period', badge: 'Nuevo · Periodos', place: 'top-right',
      state: { t: 1, panel: 'capas', colorMode: 'period', comparePeriod: cmp }, cam: HOME, hidden: !real,
    },
    {
      id: 'colmena',
      title: 'La colmena 3D',
      body: 'En **Capas** puedes cambiar los barrios por **celdas de 300 m** que muestran la actividad con más detalle, quitar el relieve o los edificios, o pasar del satélite al **plano**.',
      target: 'layer-hex', badge: 'Capas', place: 'top-right',
      state: { t: 1, panel: 'capas', layers: { hex: true } }, cam: { center: [2.168, 41.392], zoom: 12.9, pitch: 64, bearing: 20 },
    },
    {
      id: 'ranking',
      title: 'El ranking del día',
      body: `**Análisis** reúne lo que dicen los datos. El ranking ordena los barrios por llegadas, salidas o saldo del día, con flechas que marcan cuántos puestos suben o bajan respecto al día anterior. Hoy manda **${BARRIOS[star].short}**.`,
      target: 'panel', badge: 'Ranking', place: 'top-right',
      state: { t: 1, panel: 'ranking' }, cam: HOME,
    },
    {
      id: 'distritos',
      title: 'De distrito a distrito',
      body: 'El diagrama de cuerdas muestra cuánta gente viaja entre los 10 distritos ese día. Pasa el cursor por un distrito para aislar sus conexiones.',
      target: 'panel', badge: 'Distritos', place: 'top-right',
      state: { t: 1, panel: 'distritos' }, cam: HOME,
    },
    {
      id: 'burbujas',
      title: 'La hipótesis de la burbuja',
      body: ds.hasStays
        ? `¿Los barrios con más restaurantes retienen a su gente? Cada punto es un barrio: la correlación es **r = ${ds.regressionWeek.r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}**.`
        : 'Aquí contrastamos la pregunta inicial del proyecto: ¿los barrios con más restaurantes retienen a su gente? El panel explica qué falta en los datos para medirla del todo (viajes dentro del mismo barrio).',
      target: 'panel', badge: 'Burbujas', place: 'top-right',
      state: { t: 1, panel: 'estudio' }, cam: HOME,
    },
    {
      id: 'buscar',
      title: 'Busca cualquier cosa',
      body: 'El buscador encuentra barrios, días y acciones: escribe «Gràcia», «viernes» o «visitantes» y pulsa Intro.',
      hint: 'Atajo: Ctrl K o la tecla /.',
      target: 'search', badge: 'Buscador', place: 'top-right',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'compartir',
      title: 'Guarda y comparte lo que ves',
      body: 'Descarga una **captura** del mapa con su leyenda, o copia un **enlace** que abre exactamente esta vista. En **Datos** puedes importar tu propio CSV o exportar las métricas de los 73 barrios.',
      target: 'actions', badge: 'Captura y enlace', place: 'top-right',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'fin',
      title: 'Ya lo has visto todo',
      body: 'Ahora explora tú: elige un barrio, cambia de día o de periodo. Puedes volver a este recorrido cuando quieras con el botón **Tour**.',
      target: 'tour-btn', badge: 'Tour', place: 'top-right',
      state: { t: 1 }, cam: HOME, last: true,
    },
  ]
  return steps.filter((s) => !s.hidden)
}
