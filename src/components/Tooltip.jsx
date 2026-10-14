import { useStore } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { DAYS } from '../lib/colors.js'
import { fmt, pct } from '../lib/format.js'
import { dayOf, clockText } from '../lib/week.js'

export default function Tooltip() {
  const hover = useStore((s) => s.hover)
  const tq = useStore((s) => Math.floor(s.t * 4) / 4)
  const ds = useStore((s) => s.dataset)
  const mode = useStore((s) => s.colorMode)
  const sel = useStore((s) => s.sel)
  const dir = useStore((s) => s.influenceDir)
  if (!hover || hover.x < -100) return null
  const w = window.innerWidth
  const h = window.innerHeight
  const style = { left: Math.min(hover.x, w - 290), top: Math.min(hover.y, h - 220) }

  if (hover.station) {
    const st = hover.station
    return (
      <div className="tip glass" style={style} role="tooltip">
        <h4>{String(st.name).replace(/^\d+\s*-\s*/, '')}</h4>
        <div className="r"><span>Bicis libres</span><b>{st.bikes}</b></div>
        <div className="r"><span>Anclajes libres</span><b>{st.slots}</b></div>
        <div className="r"><span>Fuente</span><b>CityBikes · en directo</b></div>
      </div>
    )
  }
  const i = hover.i
  if (i == null || i < 0) return null
  const b = BARRIOS[i]
  const d = dayOf(tq)
  const t0 = Math.floor(tq)
  const arr = ds.ARR[t0][i]
  const dep = ds.DEP[t0][i]
  let share = null
  if (mode === 'influence' && sel >= 0) {
    const Ft = ds.F[t0]
    let tot = 0
    for (let j = 0; j < 73; j++) tot += dir === 'in' ? Ft[j * 73 + sel] : Ft[sel * 73 + j]
    const v = dir === 'in' ? Ft[i * 73 + sel] : Ft[sel * 73 + i]
    share = tot ? v / tot : 0
  }
  return (
    <div className="tip glass" style={style} role="tooltip">
      <p className="eyebrow" style={{ margin: 0 }}>{b.district}</p>
      <h4>{b.name}</h4>
      {share != null && <div className="r"><span>{dir === 'in' ? `Hacia ${BARRIOS[sel].short}` : `Desde ${BARRIOS[sel].short}`}</span><b>{pct(share, 1)}</b></div>}
      <div className="r"><span>Llegan · {DAYS[d].short} {clockText(tq)}</span><b>{fmt(arr)}/h</b></div>
      <div className="r"><span>Salen</span><b>{fmt(dep)}/h</b></div>
      <div className="r"><span>Burbuja del {DAYS[d].name.toLowerCase()}</span><b>{pct(ds.metrics[i].bub[d])}</b></div>
      <div className="r" style={{ marginTop: 4 }}><span>{ds.metrics[i].tag.label}</span><b style={{ fontFamily: 'var(--font-ui)', fontWeight: 400, color: 'var(--ink-3)' }}>clic para la ficha</b></div>
    </div>
  )
}
