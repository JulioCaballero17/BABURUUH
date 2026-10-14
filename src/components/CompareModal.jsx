import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeftRight } from 'lucide-react'
import { useStore } from '../store.js'
import { BARRIOS, N } from '../model/geo.js'
import { DISTRICTS } from '../data/attributes.js'
import { topFrom } from '../model/derive.js'
import { DAYS } from '../lib/colors.js'
import { dnaAxes } from '../lib/dna.js'
import { fmt, fmtK, pct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'

const CA = '#4FA69A'
const CB = '#B86FA3'

function WeekLines({ a, b, current }) {
  const W = 900
  const H = 210
  const m = { l: 44, r: 10, t: 14, b: 26 }
  const max = Math.max(...a, ...b) || 1
  const X = (t) => m.l + (t / 119) * (W - m.l - m.r)
  const Y = (v) => H - m.b - (v / max) * (H - m.t - m.b)
  const path = (s) => s.map((v, t) => `${t ? 'L' : 'M'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const area = (s) => `${path(s)}L${X(119)},${H - m.b}L${X(0)},${H - m.b}Z`
  const [hv, setHv] = useState(-1)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Llegadas por hora de los dos barrios de lunes a viernes"
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W; setHv(Math.max(0, Math.min(119, Math.round(((x - m.l) / (W - m.l - m.r)) * 119)))) }}
      onPointerLeave={() => setHv(-1)}>
      <g className="axis">
        {[0.25, 0.5, 0.75, 1].map((q) => (
          <g key={q}><line x1={m.l} x2={W - m.r} y1={Y(max * q)} y2={Y(max * q)} strokeDasharray="2 4" /><text x={m.l - 8} y={Y(max * q) + 3} textAnchor="end">{fmtK(max * q)}</text></g>
        ))}
        {DAYS.map((d, k) => (
          <g key={d.key}>
            {k > 0 && <line x1={X(k * 24)} x2={X(k * 24)} y1={m.t} y2={H - m.b} />}
            <text x={X(k * 24 + 12)} y={H - 8} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, fill: d.hue }}>{d.name}</text>
          </g>
        ))}
      </g>
      <motion.path d={area(a)} fill={CA} fillOpacity="0.14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.path d={area(b)} fill={CB} fillOpacity="0.14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.path d={path(a)} fill="none" stroke={CA} strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
      <motion.path d={path(b)} fill="none" stroke={CB} strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} />
      <line x1={X(current)} x2={X(current)} y1={m.t} y2={H - m.b} stroke="var(--ink)" strokeWidth="1.5" />
      {hv >= 0 && (
        <g>
          <line x1={X(hv)} x2={X(hv)} y1={m.t} y2={H - m.b} stroke="var(--ink-3)" />
          <circle cx={X(hv)} cy={Y(a[hv])} r="4" fill={CA} />
          <circle cx={X(hv)} cy={Y(b[hv])} r="4" fill={CB} />
          <text x={Math.min(X(hv) + 8, W - 150)} y={m.t + 10} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fill: 'var(--ink)' }}>
            {DAYS[Math.floor(hv / 24)].short} {hv % 24}h · {fmt(a[hv])} / {fmt(b[hv])}
          </text>
        </g>
      )}
    </svg>
  )
}

function DualRadar({ A, B, size = 260 }) {
  const c = size / 2
  const R = c - 40
  const n = A.length
  const P = (k, r) => { const a = (k / n) * Math.PI * 2 - Math.PI / 2; return [c + r * Math.cos(a), c + r * Math.sin(a)] }
  const poly = (ax) => ax.map((x, k) => P(k, R * Math.max(0.04, x.v)).map((q) => q.toFixed(1)).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, overflow: 'visible' }} role="img" aria-label="Perfil comparado">
      {[0.33, 0.66, 1].map((q) => <polygon key={q} points={A.map((_, k) => P(k, R * q).join(',')).join(' ')} fill="none" stroke="var(--glass-border)" />)}
      {A.map((x, k) => { const [lx, ly] = P(k, R + 18); return <text key={x.label} x={lx} y={ly + 3} textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--ink-2)', fontWeight: 550 }}>{x.label}</text> })}
      <motion.polygon initial={false} animate={{ points: poly(A) }} fill={CA} fillOpacity="0.25" stroke={CA} strokeWidth="2" />
      <motion.polygon initial={false} animate={{ points: poly(B) }} fill={CB} fillOpacity="0.25" stroke={CB} strokeWidth="2" />
    </svg>
  )
}

export default function CompareModal() {
  const open = useStore((s) => s.compareOpen)
  const close = useStore((s) => s.closeCompare)
  const sel = useStore((s) => s.sel)
  const compareB = useStore((s) => s.compareB)
  const setCompareB = useStore((s) => s.setCompareB)
  const ds = useStore((s) => s.dataset)
  const th = useStore((s) => Math.floor(s.t))
  const A = sel

  useEffect(() => {
    if (open && A >= 0 && (compareB < 0 || compareB === A)) setCompareB(topFrom(ds, A, th, 1)[0]?.j ?? (A + 1) % N)
  }, [open, A]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const k = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, close])

  const B = compareB
  const data = useMemo(() => {
    if (A < 0 || B < 0) return null
    const sa = ds.ARR.map((x) => x[A])
    const sb = ds.ARR.map((x) => x[B])
    let ab = 0
    let ba = 0
    const d = dayOf(th)
    for (let h = 0; h < 24; h++) { const F = ds.F[d * 24 + h]; ab += F[A * N + B]; ba += F[B * N + A] }
    return { sa, sb, ab, ba, d, ra: dnaAxes(ds, A), rb: dnaAxes(ds, B) }
  }, [ds, A, B, th])

  const rows = data && [
    ['Habitantes', fmt(ds.pop[A] * 1000), fmt(ds.pop[B] * 1000)],
    ['Restaurantes por 1.000 hab.', ds.rest[A].toLocaleString('es-ES'), ds.rest[B].toLocaleString('es-ES')],
    ['Llegadas en la semana', fmtK(ds.metrics[A].weekArr), fmtK(ds.metrics[B].weekArr)],
    ['Pico semanal', `${DAYS[Math.floor(ds.metrics[A].peak / 24)].short} ${ds.metrics[A].peak % 24}h`, `${DAYS[Math.floor(ds.metrics[B].peak / 24)].short} ${ds.metrics[B].peak % 24}h`],
    ['Burbuja media 20–24 h', pct(ds.metrics[A].bubAvg), pct(ds.metrics[B].bubAvg)],
    ['Viernes vs lunes (noche)', `${ds.metrics[A].friE >= 1 ? '+' : '−'}${Math.abs(Math.round((ds.metrics[A].friE - 1) * 100))} %`, `${ds.metrics[B].friE >= 1 ? '+' : '−'}${Math.abs(Math.round((ds.metrics[B].friE - 1) * 100))} %`],
    ['Perfil', ds.metrics[A].tag.label, ds.metrics[B].tag.label],
  ]

  return (
    <AnimatePresence>
      {open && A >= 0 && data && (
        <>
          <motion.div key="scrim" className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div key="modal" className="modal glass" role="dialog" aria-modal="true" aria-label="Comparar barrios" initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-46%' }} animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }} exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%', transition: { duration: 0.16 } }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <h2 className="serif" style={{ margin: 0, fontSize: 36, lineHeight: 1, color: CA }}>{BARRIOS[A].name}</h2>
                <ArrowLeftRight width={20} height={20} style={{ color: 'var(--ink-3)' }} />
                <label className="sr-only" htmlFor="cmpB">Barrio con el que comparar</label>
                <select id="cmpB" value={B} onChange={(e) => setCompareB(Number(e.target.value))} className="serif" style={{ fontSize: 30, lineHeight: 1, color: CB, background: 'transparent', border: 0, borderBottom: '1.5px dashed var(--glass-border)', paddingRight: 6, cursor: 'pointer', maxWidth: 420 }}>
                  {DISTRICTS.slice(1).map((dn, di) => (
                    <optgroup key={dn} label={dn}>
                      {BARRIOS.filter((b) => b.dist === di + 1 && b.i !== A).map((b) => <option key={b.i} value={b.i}>{b.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <button className="icon-btn" onClick={close} aria-label="Cerrar comparación"><X /></button>
            </div>
            <p className="note" style={{ marginTop: 8 }}>
              El {DAYS[data.d].name.toLowerCase()}, {fmt(data.ab)} personas van de {BARRIOS[A].short} a {BARRIOS[B].short} y {fmt(data.ba)} hacen el camino contrario.
            </p>

            <div style={{ marginTop: 18 }}>
              <div className="section-title"><h3>Llegadas por hora, lunes a viernes</h3><span>línea vertical: momento actual</span></div>
              <WeekLines a={data.sa} b={data.sb} current={th} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)', gap: 24, marginTop: 18, alignItems: 'start' }}>
              <div>
                <div className="section-title"><h3>En cifras</h3></div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th style={{ textAlign: 'left', fontWeight: 500, color: 'var(--ink-3)', padding: '6px 0' }} /><th style={{ textAlign: 'right', color: CA, padding: '6px 8px' }}>{BARRIOS[A].short}</th><th style={{ textAlign: 'right', color: CB, padding: '6px 0' }}>{BARRIOS[B].short}</th></tr></thead>
                  <tbody>
                    {rows.map(([l, a, b]) => (
                      <tr key={l} style={{ borderTop: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '9px 0', color: 'var(--ink-2)' }}>{l}</td>
                        <td className="num" style={{ textAlign: 'right', padding: '9px 8px' }}>{a}</td>
                        <td className="num" style={{ textAlign: 'right', padding: '9px 0' }}>{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="section-title" style={{ marginTop: 18 }}><h3>Burbuja por día</h3></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, height: 100, alignItems: 'end' }}>
                  {DAYS.map((d, k) => {
                    const mx = Math.max(...ds.metrics[A].bub, ...ds.metrics[B].bub) || 1
                    return (
                      <div key={d.key} style={{ display: 'grid', gap: 4, justifyItems: 'center', alignContent: 'end', height: '100%' }}>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 70, width: '100%' }}>
                          <motion.span initial={{ height: 0 }} animate={{ height: `${(ds.metrics[A].bub[k] / mx) * 100}%` }} style={{ flex: 1, background: CA, borderRadius: '5px 5px 2px 2px' }} title={`${BARRIOS[A].short}: ${pct(ds.metrics[A].bub[k])}`} />
                          <motion.span initial={{ height: 0 }} animate={{ height: `${(ds.metrics[B].bub[k] / mx) * 100}%` }} style={{ flex: 1, background: CB, borderRadius: '5px 5px 2px 2px' }} title={`${BARRIOS[B].short}: ${pct(ds.metrics[B].bub[k])}`} />
                        </div>
                        <span className="serif" style={{ fontStyle: 'italic', fontSize: 16, color: d.hue, lineHeight: 1 }}>{d.key}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <div className="section-title"><h3>ADN comparado</h3></div>
                <div style={{ display: 'grid', placeItems: 'center' }}><DualRadar A={data.ra} B={data.rb} /></div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
