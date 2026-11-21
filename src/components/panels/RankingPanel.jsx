import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useStore } from '../../store.js'
import { Segmented } from '../ui/primitives.jsx'
import { BARRIOS, N } from '../../model/geo.js'
import { DISTRICT_COLORS } from '../../lib/colors.js'
import { fmtK, pct } from '../../lib/format.js'
import { dayOf } from '../../lib/week.js'
import { selectBarrio } from '../../engine/mapEngine.js'

const valueAt = (A, d, i) => A[d][i]

export default function RankingPanel() {
  const ds = useStore((s) => s.dataset)
  const tq = useStore((s) => dayOf(s.t))
  const sel = useStore((s) => s.sel)
  const [metric, setMetric] = useState('arr')

  const rows = useMemo(() => {
    const day = dayOf(tq)
    const prevT = (tq + 4) % 5
    const val = (i, t) => {
      if (metric === 'arr') return valueAt(ds.ARR, t, i)
      if (metric === 'dep') return valueAt(ds.DEP, t, i)
      if (metric === 'net') return valueAt(ds.ARR, t, i) - valueAt(ds.DEP, t, i)
      return ds.metrics[i].bub[t]
    }
    const all = Array.from({ length: N }, (_, i) => ({ i, v: val(i, tq), p: val(i, prevT) }))
    all.sort((a, b) => b.v - a.v)
    const prevRank = new Map([...all].sort((a, b) => b.p - a.p).map((o, k) => [o.i, k]))
    const top = all.slice(0, 12).map((o, k) => ({ ...o, move: (prevRank.get(o.i) ?? k) - k }))
    const max = Math.max(...top.map((o) => Math.abs(o.v))) || 1
    return { top, max, day }
  }, [ds, tq, metric])

  const fmtV = (v) => (metric === 'bub' ? pct(v) : metric === 'net' ? `${v >= 0 ? '+' : '−'}${fmtK(Math.abs(v))}` : fmtK(v))

  return (
    <>
      <Segmented id="rank" label="Métrica" value={metric} onChange={setMetric} options={[{ value: 'arr', label: 'Llegan' }, { value: 'dep', label: 'Salen' }, { value: 'net', label: 'Saldo' }, { value: 'bub', label: 'Burbuja' }]} />
      <p className="note" style={{ marginTop: -10 }}>
        {metric === 'arr' && 'Viajes que llegan al barrio el día seleccionado.'}
        {metric === 'dep' && 'Viajes que salen del barrio el día seleccionado.'}
        {metric === 'net' && 'Llegadas menos salidas: quién se llena y quién se vacía.'}
        {metric === 'bub' && 'Parte de los viajes que empiezan en el barrio y acaban dentro de él, ese día.'}
      </p>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {rows.top.map((o, k) => (
          <motion.li key={o.i} layout transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
            <button className="row" style={{ width: '100%', minHeight: 48, padding: '6px 10px', background: o.i === sel ? 'var(--wash-2)' : undefined }} onClick={() => selectBarrio(o.i)}>
              <span className="num" style={{ width: 20, fontSize: 12, color: 'var(--ink-3)', textAlign: 'right' }}>{k + 1}</span>
              <span className="txt" style={{ display: 'grid', gap: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i style={{ width: 7, height: 7, borderRadius: 2, background: DISTRICT_COLORS[BARRIOS[o.i].dist], flex: 'none' }} />
                  <b style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{BARRIOS[o.i].name}</b>
                </span>
                <span style={{ height: 4, borderRadius: 2, background: 'var(--wash-2)', overflow: 'hidden' }}>
                  <motion.i style={{ display: 'block', height: '100%', background: 'var(--day)', borderRadius: 2 }} animate={{ width: `${(Math.abs(o.v) / rows.max) * 100}%` }} transition={{ type: 'spring', stiffness: 160, damping: 24 }} />
                </span>
              </span>
              <span style={{ display: 'grid', justifyItems: 'end', gap: 2, minWidth: 64 }}>
                <span className="num" style={{ fontSize: 13 }}>{fmtV(o.v)}</span>
                {o.move !== 0 && metric !== 'bub' && (
                  <span style={{ fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 2, color: o.move > 0 ? 'var(--good)' : 'var(--warn)' }}>
                    {o.move > 0 ? <ArrowUpRight width={12} height={12} /> : <ArrowDownLeft width={12} height={12} />}{Math.abs(o.move)}
                  </span>
                )}
              </span>
            </button>
          </motion.li>
        ))}
      </ol>
      <p className="note">Las flechas indican cuántos puestos ha ganado o perdido respecto al día anterior (el lunes se compara con el viernes).</p>
    </>
  )
}
