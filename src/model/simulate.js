// Gravity model that generates a plausible Monday–Friday origin→destination dataset
// (5 days × 24 hours × 73 × 73). It exists so the app is explorable before the real
// data arrives; the Datos panel replaces it with an imported CSV.
import { BARRIOS, N, DM, hash } from './geo.js'
import { MATCH_BARRIO, OFFICE_22 } from '../data/attributes.js'

export const HOURS = 120

const WF = [1, 1.03, 1.02, 0.99, 0.86] // work volume (Friday: remote work)
const LF = [0.55, 0.6, 0.68, 0.85, 1.1] // evening leisure volume
const NF = [0.25, 0.3, 0.35, 0.55, 0.85] // after-midnight tail (previous night)
const SF = [1.08, 1.05, 1, 0.93, 0.8] // how much people stay in their own barrio
const THU = { 0: 0.22, 1: 0.2, 30: 0.3, 10: 0.22, 9: 0.2, 7: 0.15 } // Thursday university night
const FRI = { 67: 0.35, 66: 0.4, 0: 0.25, 1: 0.25, 2: 0.3, 10: 0.22, 3: 0.22, 7: 0.2, 30: 0.15 } // Friday night-life

const gauss = (h, mu, sd) => {
  let d = Math.abs(h - mu)
  d = Math.min(d, 24 - d)
  return Math.exp(-(d * d) / (2 * sd * sd))
}
const Wc = (d, h) => WF[d] * (gauss(h, 8.3, 1.1) + 0.3 * gauss(h, 15, 1) * (d === 4 ? 0.65 : 1))
const Lc = (d, h) => 0.5 * gauss(h, 13.9, 1) * (d === 4 ? 1.3 : 1) + LF[d] * gauss(h, d === 4 ? 21.4 : 20.6, 1.5 + (d >= 3 ? 0.3 : 0)) + NF[d] * 0.35 * gauss(h, 0.6, 1.2)
const Hwc = (d, h) => gauss(h, d === 4 ? 17.2 : 18.6, 1.4) + 0.35 * gauss(h, 14, 1)
const Hlc = (d, h) => 0.45 * gauss(h, 15.8, 1.1) + 0.8 * LF[d] * gauss(h, d === 4 ? 23.4 : 22.6, 1.5) + 0.5 * NF[d] * gauss(h, 1.5, 1.4)
const Ec = (h) => gauss(h, 10.8, 2.2) + 0.8 * gauss(h, 17.5, 2)

function rowWeights(fn, k) {
  const M = new Float32Array(N * N)
  for (let i = 0; i < N; i++) {
    let s = 0
    for (let j = 0; j < N; j++) {
      if (i === j) continue
      const w = fn(j) * Math.exp(-DM[i * N + j] / k)
      M[i * N + j] = w
      s += w
    }
    for (let j = 0; j < N; j++) M[i * N + j] /= s || 1
  }
  return M
}

export function simulateWeek() {
  const B = BARRIOS
  const maxRest = Math.max(...B.map((b) => b.rest))
  const wH = rowWeights((j) => B[j].pop, 3.2)
  const wA = [0, 1, 2, 3, 4].map((d) => rowWeights((j) => Math.pow(B[j].wrk, 1.2) * (d === 4 && (j === OFFICE_22 || j === 6) ? 0.8 : 1) * (0.94 + 0.12 * hash(j * 5 + d)), 3.0))
  const wB = [0, 1, 2, 3, 4].map((d) => rowWeights((j) => Math.pow(B[j].lei * (1 + (d === 3 ? THU[j] || 0 : 0) + (d === 4 ? FRI[j] || 0 : 0)), 1.4) * (0.92 + 0.16 * hash(j * 11 + d)), 2.4))
  const stayA = B.map((b) => 0.06 + 0.22 * b.wrk)
  const stayBase = B.map((b, i) => Math.max(0.05, 0.08 + 0.34 * Math.pow(b.rest / maxRest, 0.9) + 0.22 * (hash(i + 40) - 0.5)))
  const F = Array.from({ length: HOURS }, () => new Float32Array(N * N))

  const put = (Fh, i, vol, stay, Wm, acc) => {
    Fh[i * N + i] += vol * stay
    if (acc) acc[i] += vol * stay
    const r = vol * (1 - stay)
    for (let j = 0; j < N; j++) {
      if (j === i) continue
      const v = r * Wm[i * N + j]
      Fh[i * N + j] += v
      if (acc) acc[j] += v
    }
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  for (let d = 0; d < 5; d++) {
    const arrA = new Float32Array(N)
    const arrB = new Float32Array(N)
    let sHw = 0
    let sHl = 0
    for (let h = 0; h < 24; h++) { sHw += Hwc(d, h); sHl += Hlc(d, h) }
    for (let h = 0; h < 24; h++) {
      const Fh = F[d * 24 + h]
      for (let i = 0; i < N; i++) {
        const p = B[i].pop * 1000
        put(Fh, i, p * 0.1 * Wc(d, h), stayA[i], wA[d], arrA)
        put(Fh, i, p * 0.05 * Lc(d, h), clamp(stayBase[i] * SF[d], 0.03, 0.8), wB[d], arrB)
        put(Fh, i, p * 0.03 * Ec(h), 0.5, wH, null)
        if (d === 2 && i !== MATCH_BARRIO) {
          const g = gauss(h, 19.8, 0.8) * (1 - Math.min(1, DM[i * N + MATCH_BARRIO] / 14))
          Fh[i * N + MATCH_BARRIO] += p * 0.006 * g
        }
      }
      if (d === 2) {
        const back = gauss(h, 23.1, 0.7)
        for (let j = 0; j < N; j++) if (j !== MATCH_BARRIO) Fh[MATCH_BARRIO * N + j] += back * B[j].pop * 1000 * 0.0054
      }
    }
    for (let h = 0; h < 24; h++) {
      const Fh = F[d * 24 + h]
      for (let i = 0; i < N; i++) {
        put(Fh, i, (arrA[i] * Hwc(d, h)) / sHw, stayA[i], wH, null)
        put(Fh, i, (arrB[i] * Hlc(d, h)) / sHl, clamp(stayBase[i] * SF[d], 0.03, 0.8), wH, null)
      }
    }
  }
  return F
}
