import { RAMP_ACTIVITY, RAMP_DELTA, RAMP_INFLUENCE, RAMP_VISITORS, RAMP_SCORE, DAYS } from './colors.js'
import { BARRIOS } from '../model/geo.js'
import { BUSINESSES, VISITOR_KINDS } from '../model/tools.js'

export const MODES = {
  activity: { label: 'Actividad', ramp: RAMP_ACTIVITY },
  influence: { label: 'Influencia', ramp: RAMP_INFLUENCE },
  score: { label: 'Dónde abrir', ramp: RAMP_SCORE },
  sim: { label: 'Simulador', ramp: RAMP_DELTA },
  visitors: { label: 'Turismo', ramp: RAMP_VISITORS },
}

const pctTxt = (v) => `${Math.round(v * 100)} %`

// What the colour (and the height) of the barrios means right now, in plain words.
export function legendFor(s) {
  const day = DAYS[Math.round(s.t ?? 0) % 5].name.toLowerCase()
  if (s.view === 'abrir') {
    const b = BUSINESSES.find((x) => x.key === s.business) || BUSINESSES[0]
    return { title: `Encaje para ${b.label.toLowerCase()}`, ramp: RAMP_SCORE, min: 'Peor', max: 'Mejor', note: 'Altura: los mejores barrios destacan' }
  }
  if (s.view === 'simular') {
    return { title: `Llegadas simuladas frente a un ${day} normal`, ramp: RAMP_DELTA, min: 'Menos gente', mid: 'Igual', max: 'Más gente', note: 'Arcos: de dónde sale o adónde se desvía la gente' }
  }
  if (s.view === 'turismo') {
    const k = VISITOR_KINDS.find((x) => x.key === s.visitorKind) || VISITOR_KINDS[0]
    if (!s.visitorRange) return { title: 'Visitantes', ramp: RAMP_VISITORS, min: '', max: '', note: 'Estos datos no distinguen tipos de viajero' }
    return { title: `Parte de quien llega · ${k.label.toLowerCase()} · ${day}`, ramp: RAMP_VISITORS, min: pctTxt(s.visitorRange[0]), max: pctTxt(s.visitorRange[1]), note: 'Altura: llegadas por km²' }
  }
  if (s.colorMode === 'influence' && s.sel >= 0) {
    return { title: `Adónde va la gente de ${BARRIOS[s.sel].short}`, ramp: RAMP_INFLUENCE, min: 'Poca', max: 'Mucha', note: 'Parte de sus viajes de ese día' }
  }
  return { title: `Llegadas por km² · ${day}`, ramp: RAMP_ACTIVITY, min: 'Tranquilo', max: 'Muy activo', note: 'Altura y color' }
}
