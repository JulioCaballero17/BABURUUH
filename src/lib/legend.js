import { RAMP_ACTIVITY, RAMP_DELTA, RAMP_BUBBLE, RAMP_INFLUENCE, RAMP_VISITORS, DAYS } from './colors.js'
import { BARRIOS } from '../model/geo.js'

export const MODES = {
  activity: { label: 'Actividad', desc: 'Cuánta gente llega a cada barrio ese día', ramp: RAMP_ACTIVITY },
  delta: { label: 'Cambio entre días', desc: 'Llegadas comparadas con otro día de la semana', ramp: RAMP_DELTA },
  period: { label: 'Cambio entre periodos', desc: 'Llegadas comparadas con otro mes o año', ramp: RAMP_DELTA },
  visitors: { label: 'Visitantes', desc: 'Qué parte de quien llega viene de fuera de Barcelona', ramp: RAMP_VISITORS },
  influence: { label: 'Influencia', desc: 'Adónde va (o de dónde viene) la gente de un barrio', ramp: RAMP_INFLUENCE },
  bubble: { label: 'Burbuja', desc: 'Viajes que no salen del barrio', ramp: RAMP_BUBBLE },
}

const pctTxt = (v) => `${Math.round(v * 100)} %`

// What the colour (and the height) of the barrios means right now, in plain words.
export function legendFor(s) {
  const m = MODES[s.colorMode] || MODES.activity
  const day = DAYS[Math.round(s.t ?? 0) % 5].name.toLowerCase()
  const height = 'Altura: llegadas por km²'
  if (s.colorMode === 'delta') {
    return { title: `${DAYS[Math.round(s.t ?? 0) % 5].name} frente al ${DAYS[s.deltaBase].name.toLowerCase()}`, ramp: m.ramp, min: '−50 % o menos', mid: 'Igual', max: '+100 % o más', note: height }
  }
  if (s.colorMode === 'period') {
    const ref = s.periods?.find((p) => p.id === s.comparePeriod)?.label || 'otro periodo'
    const cur = s.periods?.find((p) => p.id === s.period)?.label || 'este periodo'
    if (s.dataState === 'csv') return { title: 'Cambio entre periodos', ramp: m.ramp, min: '', max: '', note: 'Solo disponible con los datos de Telefónica' }
    return { title: `${cur} frente a ${ref}`, ramp: m.ramp, min: '−50 % o menos', mid: 'Igual', max: '+100 % o más', note: 'Media de llegadas de lunes a viernes' }
  }
  if (s.colorMode === 'visitors') {
    if (!s.visitorRange) return { title: 'Visitantes', ramp: m.ramp, min: '', max: '', note: 'Este conjunto de datos no distingue tipos de viajero' }
    const who = s.visitorKind === 'intl' ? 'visitantes internacionales' : 'visitantes (Cataluña, España y extranjero)'
    return { title: `Llegadas de ${who} · ${day}`, ramp: m.ramp, min: pctTxt(s.visitorRange[0]), max: pctTxt(s.visitorRange[1]), note: height }
  }
  if (s.colorMode === 'bubble') {
    return { title: `Burbuja · ${day}`, ramp: m.ramp, min: 'Abierta', max: 'Cerrada', note: s.dataset?.hasStays === false ? 'Sin datos: el fichero no incluye viajes dentro del mismo barrio' : height }
  }
  if (s.colorMode === 'influence') {
    if (s.sel < 0) return { title: 'Influencia', ramp: m.ramp, min: '', max: '', note: 'Haz clic en un barrio del mapa para elegirlo' }
    return { title: s.influenceDir === 'in' ? `De dónde viene quien llega a ${BARRIOS[s.sel].short}` : `Adónde va la gente de ${BARRIOS[s.sel].short}`, ramp: m.ramp, min: 'Poca', max: 'Mucha', note: 'Parte de sus viajes de ese día' }
  }
  return { title: `Llegadas por km² · ${day}`, ramp: m.ramp, min: 'Tranquilo', max: 'Muy activo', note: 'Altura y color' }
}
