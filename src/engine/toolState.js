// Cached results of the tools, shared by the map engine and the panels (computed once per input).
import { siteScores, simulate, visitorShareOf, SCENARIOS, findBarrio } from '../model/tools.js'
import { routeFlows, edgeKey } from './metro.js'
import { topTo } from '../model/derive.js'
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
  if (k !== simKey || (s.metroLines.length && !simVal?.lineImpact)) {
    simKey = k
    const r = simulate(s.dataset, s.scenario, { place, amount, day })
    // the extra (or missing) trips, routed over the network of neighbouring barrios
    const corridors = routeFlows(r.allFlows)
    const byEdge = new Map(corridors.map((c) => [edgeKey(c.a, c.b), c]))
    const lineImpact = s.metroLines.length ? s.metroLines.map((l) => {
      let extra = 0
      for (let q = 1; q < l.stations.length; q++) extra += byEdge.get(edgeKey(l.stations[q - 1], l.stations[q]))?.net || 0
      return { id: l.id, name: l.name, color: l.color, from: l.stations[0], to: l.stations[l.stations.length - 1], change: l.load ? extra / (l.stations.length - 1) / l.load : 0 }
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change)) : null
    simVal = { ...r, place, amount, day, corridors: corridors.slice(0, 16), lineImpact, key: k }
  }
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

// Who would be the customers of a barrio: where the people who arrive come from.
export function catchment(s, i, k = 12) {
  const day = dayOf(s.t)
  return topTo(s.dataset, i, day, k).filter((o) => o.v > 0)
}
