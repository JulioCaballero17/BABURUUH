// The Tour: a guided walk through what Baburu does, built for presenting.
// Each step puts the app in a known state (mode, day, barrio, tool settings, camera), lights up
// the control it talks about, and writes its text from the data that is loaded.
import { BARRIOS, N } from '../model/geo.js'
import { siteScores, simulate, findBarrio, visitorShareOf, visitorSeason } from '../model/tools.js'
import { segmentLabel } from '../model/realData.js'
import { fmt, fmtK, pct } from './format.js'
import { DAYS } from './colors.js'

const HOME = { center: [2.161, 41.393], zoom: 12.25, pitch: 57, bearing: -28 }
const camOn = (i, extra = {}) => ({ center: BARRIOS[i].c, zoom: 13.2, pitch: 60, bearing: -30, ...extra })
const names = (list) => list.map((i) => BARRIOS[i].short).join(', ').replace(/, ([^,]*)$/, ' y $1')

// The state every step starts from, so any step can be opened directly.
export const BASE = {
  sel: -1,
  colorMode: 'activity',
  view: 'mapa',
  metroVariant: 'all',
  metroFocus: -1,
  simPlace: -1,
  simAmount: null,
  cmdk: false,
  playing: false,
  layers: { flows: true, arcs: true, hex: false, bubbles: false, barrios: '3d', pulse: false },
}

export function buildTour(ds, st) {
  const real = ds.source.kind === 'real'
  const elig = ds.metrics.filter((m) => ds.pop[m.i] >= 5 && m.weekArr > 0)
  const star = [...elig].sort((a, b) => b.arr[1] - a.arr[1])[0]?.i ?? 0
  const busiest = ds.MOV.indexOf(Math.max(...ds.MOV))
  const months = st.periods.filter((p) => p.kind === 'month')
  const vis = visitorShareOf(ds, 1, 'all')

  let evoTxt = 'La línea muestra cómo cambian sus llegadas de un mes a otro.'
  if (st.summary) {
    const ms = st.summary.periods.filter((p) => p.kind === 'month')
    const segs = st.segment === 'all' ? st.summary.segments : [st.segment]
    const vals = ms.map((p) => segs.reduce((a, n) => a + (st.summary.arr[p.id]?.[n]?.[star] || 0), 0))
    const hi = vals.indexOf(Math.max(...vals))
    const lo = vals.indexOf(Math.min(...vals))
    if (ms.length) evoTxt = `Su mes más concurrido fue **${ms[hi].label.toLowerCase()}** y el más tranquilo, **${ms[lo].label.toLowerCase()}**.`
  }

  const ocio = siteScores(ds, 'ocio')
  const turista = siteScores(ds, 'turista')
  const event = findBarrio('La Maternitat i Sant Ramon')
  const sEv = simulate(ds, 'evento', { place: event, amount: 60000, day: 2 })
  const gotic = findBarrio('el Barri Gòtic')
  const sCl = simulate(ds, 'cierre', { place: gotic, amount: 70, day: 2 })
  const intl = visitorShareOf(ds, 2, 'intl')
  const intlTop = intl ? [...elig].sort((a, b) => intl[b.i] - intl[a.i]).slice(0, 3).map((m) => m.i) : []
  const season = visitorSeason(st.summary, 'intl')
  const peak = season ? season.months[season.vals.indexOf(Math.max(...season.vals))] : null
  const ml = st.metroLines?.[0]

  const steps = [
    {
      id: 'hola',
      title: 'Esto es Baburu',
      body: 'Baburu convierte los datos de movilidad de Telefónica en **cinco respuestas** sobre Barcelona: cómo se mueve cada día, qué metro pediría, dónde abrir un negocio, qué pasaría si algo cambia y adónde van los turistas. Arriba eliges cuál.',
      target: 'views', badge: 'Cinco formas de ver la ciudad', place: 'bottom-left',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'semana',
      title: 'La semana, como una línea de metro',
      body: `Cada columna es un barrio: **cuanto más alta y más amarilla, más gente llega**. Abajo, cada parada es un día laborable. El ${DAYS[busiest].name.toLowerCase()} es el que más se mueve, con **${fmtK(ds.MOV[busiest])} viajes** entre barrios.`,
      hint: 'Toca una parada o usa las teclas 1 a 5.',
      target: 'metro', badge: 'Día de la semana', place: 'top-right',
      state: { t: busiest }, cam: HOME,
    },
    {
      id: 'play',
      title: 'Mira cómo respira la ciudad',
      body: 'Con el botón amarillo la semana avanza sola. Las columnas suben y bajan, y **las líneas amarillas son los trayectos más fuertes de cada día**.',
      target: 'play', badge: 'Reproducir', place: 'top-right',
      state: { t: 0, playing: true }, cam: { center: [2.165, 41.392], zoom: 12.6, pitch: 62, bearing: -12 },
    },
    {
      id: 'periodo',
      title: 'Cualquier mes, cualquier viajero',
      body: real
        ? `Hay **${months.length} meses** de datos, de ${months[0]?.label.toLowerCase()} a ${months[months.length - 1]?.label.toLowerCase()}. Elige un mes, un año o todo junto, y filtra residentes o visitantes. Todo Baburu se recalcula al momento.`
        : 'Aquí eliges el periodo y el tipo de viajero.',
      hint: real ? `Ahora: ${ds.source.period} · ${segmentLabel(st.segment).toLowerCase()}` : null,
      target: 'dock-data', badge: 'Periodo y viajeros', place: 'top-right',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'ficha',
      title: 'Cada barrio, su ficha',
      body: `Toca cualquier barrio. **${BARRIOS[star].name}** es el que más gente recibe un martes: **${fmt(ds.ARR[1][star])} llegadas**${vis ? `, y el ${pct(vis[star])} no vive en Barcelona` : ''}.`,
      target: 'drawer', badge: 'Ficha del barrio', place: 'bottom-left',
      state: { t: 1, sel: star }, cam: camOn(star),
    },
    {
      id: 'evolucion',
      title: 'Su historia, mes a mes',
      body: `${evoTxt} Toca un mes para cargarlo. Debajo, **quién llega**: residentes o visitantes de Cataluña, de España y del extranjero.`,
      target: 'drawer-evo', badge: 'Evolución', place: 'bottom-left', scroll: 'drawer-evo',
      state: { t: 1, sel: star }, cam: camOn(star), hidden: !real,
    },
    {
      id: 'metro-plan',
      title: 'El metro que pide Barcelona',
      body: `**Metro** redibuja la ciudad como un plano de metro. Las cinco líneas no son las reales: son **las rutas entre barrios vecinos que más viajes acumulan**. La más cargada${ml ? `, la ${ml.name}, va de ${BARRIOS[ml.stations[0]].short} a ${BARRIOS[ml.stations[ml.stations.length - 1]].short}` : ' cruza el centro'}.`,
      hint: 'Pasa el cursor por una línea de la leyenda para aislarla.',
      target: 'view-metro', badge: 'Metro', place: 'top-right',
      state: { t: 1, view: 'metro' }, cam: { center: [2.172, 41.403], zoom: 12.35, pitch: 0, bearing: 0 },
    },
    {
      id: 'abrir',
      title: '¿Dónde abro mi negocio?',
      body: `**Dónde abrir** puntúa cada barrio para un tipo de negocio con la gente que llega, quién es y qué día viene. Para restauración y ocio gana **${BARRIOS[ocio.top[0].i].name}**, seguido de ${names(ocio.top.slice(1).map((t) => t.i))}. Las líneas amarillas muestran **de dónde vendrían tus clientes**.`,
      target: 'panel', badge: 'Dónde abrir', place: 'top-right',
      state: { t: 1, view: 'abrir', business: 'ocio' }, cam: { center: [2.165, 41.395], zoom: 12.3, pitch: 55, bearing: -22 },
    },
    {
      id: 'abrir-2',
      title: 'Cambia el negocio, cambia el mapa',
      body: `Una tienda para turistas no busca lo mismo: aquí el podio es **${names(turista.top.map((t) => t.i))}**, porque es donde se concentra el visitante de fuera. Cada puesto explica **por qué**.`,
      target: 'podium', badge: 'El podio', place: 'top-right',
      state: { t: 1, view: 'abrir', business: 'turista' }, cam: { center: [2.172, 41.388], zoom: 12.8, pitch: 55, bearing: -10 },
    },
    {
      id: 'simular',
      title: '¿Qué pasa si…?',
      body: event >= 0
        ? `El **Simulador** prueba escenarios. Un partido con **60.000 personas** en ${BARRIOS[event].short} multiplica sus llegadas (+${pct(sEv.change[event])}), y la gente viaja hacia allí sobre todo desde ${names(sEv.flows.slice(0, 3).map((f) => f.i))}, y **brillan las rutas que se saturarían**.`
        : 'El Simulador prueba escenarios: eventos, cierres o más teletrabajo.',
      hint: 'Compara «Un día normal» con «Con el escenario». Haz clic en el mapa para mover el evento.',
      target: 'sim-result', badge: 'Simulador', place: 'top-right',
      state: { t: 2, view: 'simular', scenario: 'evento' }, cam: event >= 0 ? { center: BARRIOS[event].c, zoom: 12.4, pitch: 58, bearing: -30 } : HOME,
    },
    {
      id: 'simular-2',
      title: 'Si cierra un barrio',
      body: gotic >= 0
        ? `Si el ${BARRIOS[gotic].short} se cerrara por obras, quien iba allí se repartiría sobre todo entre **${names(sCl.flows.slice(0, 3).map((f) => f.j))}**. Útil para planificar cortes, eventos o refuerzos de transporte.`
        : 'Si un barrio se cierra, su gente se reparte entre los vecinos.',
      hint: 'El deslizador ajusta la intensidad del escenario.',
      target: 'sim-ctl', badge: 'Escenario', place: 'top-right',
      state: { t: 2, view: 'simular', scenario: 'cierre' }, cam: gotic >= 0 ? { center: BARRIOS[gotic].c, zoom: 13.4, pitch: 58, bearing: 20 } : HOME,
    },
    {
      id: 'turismo',
      title: 'Adónde van los turistas',
      body: `**Turismo** colorea cada barrio por la parte de su gente que viene de fuera. Con el visitante extranjero destacan **${names(intlTop)}**.${peak ? ` El pico de la temporada fue **${peak.label.toLowerCase()}**.` : ''}`,
      hint: 'Pulsa «Reproducir» para ver la temporada mes a mes en el mapa.',
      target: 'season', badge: 'La temporada', place: 'top-right',
      state: { t: 2, view: 'turismo', visitorKind: 'intl' }, cam: { center: [2.172, 41.39], zoom: 12.7, pitch: 55, bearing: -20 }, hidden: !ds.segArr,
    },
    {
      id: 'turismo-metro',
      title: 'El metro de los visitantes',
      body: 'En Turismo, un botón redibuja el metro **solo con los viajes de quien no vive en Barcelona**. Comparado con el de todos, enseña qué rutas pide el visitante y dónde se cruzan con las de los vecinos.',
      target: 'legend', badge: 'Metro de los visitantes', place: 'top-right',
      state: { t: 2, view: 'metro', metroVariant: 'visit' }, cam: { center: [2.172, 41.4], zoom: 12.5, pitch: 0, bearing: 0 }, hidden: !ds.segF,
    },
    {
      id: 'compartir',
      title: 'Guárdalo y compártelo',
      body: 'Busca cualquier barrio con **Ctrl K**, descarga una **captura** con su leyenda o copia un **enlace** que abre exactamente esta vista.',
      target: 'actions', badge: 'Buscar, capturar, compartir', place: 'top-right',
      state: { t: 1 }, cam: HOME,
    },
    {
      id: 'fin',
      title: 'Ahora, tú',
      body: 'Elige un barrio, un negocio o un escenario. Puedes volver a este recorrido cuando quieras con el botón **Tour**.',
      target: 'tour-btn', badge: 'Tour', place: 'top-right',
      state: { t: 1 }, cam: HOME, last: true,
    },
  ]
  return steps.filter((s) => !s.hidden)
}
