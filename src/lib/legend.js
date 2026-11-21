import { RAMP_ACTIVITY, RAMP_DELTA, RAMP_BUBBLE, RAMP_INFLUENCE, DAYS } from './colors.js'
import { BARRIOS } from '../model/geo.js'

export const MODES = {
  activity: { label: 'Actividad', desc: 'Llegadas por km² ese día', ramp: RAMP_ACTIVITY },
  delta: { label: 'Diferencia', desc: 'Llegadas comparadas con otro día', ramp: RAMP_DELTA },
  bubble: { label: 'Burbuja', desc: 'Viajes del día que no salen del barrio', ramp: RAMP_BUBBLE },
  influence: { label: 'Influencia', desc: 'Adónde va (o de dónde viene) la gente de un barrio', ramp: RAMP_INFLUENCE },
}

export function legendFor(s) {
  const m = MODES[s.colorMode]
  if (s.colorMode === 'delta') return { title: `Respecto al ${DAYS[s.deltaBase].name.toLowerCase()}`, ramp: m.ramp, min: '−50 % o menos', max: '+100 % o más', note: 'Altura: llegadas por km²' }
  if (s.colorMode === 'bubble') return { title: `Índice de burbuja · ${DAYS[Math.round(s.t) % 5].name.toLowerCase()}`, ramp: m.ramp, min: 'Abierta', max: 'Cerrada', note: s.dataset.hasStays ? 'Altura: llegadas por km²' : 'Sin datos: no hay viajes dentro de un mismo barrio' }
  if (s.colorMode === 'influence') {
    if (s.sel < 0) return { title: 'Influencia', ramp: m.ramp, min: 'Elige un barrio', max: '', note: '' }
    return { title: s.influenceDir === 'in' ? `Origen de quien llega a ${BARRIOS[s.sel].short}` : `Destino de la gente de ${BARRIOS[s.sel].short}`, ramp: m.ramp, min: 'Poca', max: 'Mucha', note: 'Proporción de sus viajes ese día' }
  }
  return { title: 'Llegadas por km²', ramp: m.ramp, min: 'Tranquilo', max: 'Muy activo', note: 'Altura y color' }
}
