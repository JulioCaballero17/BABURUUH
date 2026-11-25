// Cached results of the tools, shared by the map engine and the panels (computed once per input).
import { siteScores, simulate, visitorShareOf, SCENARIOS, findBarrio } from '../model/tools.js'
import { dayOf } from '../lib/week.js'

let scoreKey = ''
let scoreVal = null
export function getScores(s) {
  const k = `${s.dataset.version}|${s.business}`
  if (k !== scoreKey) { scoreKey = k; scoreVal = siteScores(s.dataset, s.business) }
  return scoreVal
}

export const simPlaceOf = (s) => {
  const sc = SCENARIOS.find((x) => x.key === s.scenario)
  if (!sc?.place) return -1
  return s.simPlace >= 0 ? s.simPlace : findBarrio(sc.place)
}
export const simAmountOf = (s) => {
  const sc = SCENARIOS.find((x) => x.key === s.scenario)
  return s.simAmount ?? sc.amount.value
}

let simKey = ''
let simVal = null
export function getSim(s) {
  const day = dayOf(s.t)
  const place = simPlaceOf(s)
  const amount = simAmountOf(s)
  const k = `${s.dataset.version}|${s.scenario}|${place}|${amount}|${day}`
  if (k !== simKey) { simKey = k; simVal = { ...simulate(s.dataset, s.scenario, { place, amount, day }), place, amount, day } }
  return simVal
}

let visKey = ''
let visVal = null
export function getVisitors(s) {
  const day = dayOf(s.t)
  const k = `${s.dataset.version}|${s.visitorKind}|${day}`
  if (k !== visKey) {
    visKey = k
    const share = visitorShareOf(s.dataset, day, s.visitorKind)
    let lo = 1
    let hi = 0
    if (share) for (let i = 0; i < share.length; i++) { if (s.dataset.ARR[day][i] < 200) continue; lo = Math.min(lo, share[i]); hi = Math.max(hi, share[i]) }
    visVal = share ? { share, lo, hi: hi > lo ? hi : lo + 0.01 } : null
  }
  return visVal
}
