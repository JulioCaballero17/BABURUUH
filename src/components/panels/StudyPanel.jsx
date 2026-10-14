import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '../../store.js'
import { Segmented, stagger } from '../ui/primitives.jsx'
import Scatter from '../charts/Scatter.jsx'
import { BARRIOS } from '../../model/geo.js'
import { DAYS } from '../../lib/colors.js'
import { dayOf } from '../../lib/week.js'
import { selectBarrio } from '../../engine/mapEngine.js'
import { linreg } from '../../model/derive.js'
import { pct } from '../../lib/format.js'

function strength(r) {
  const a = Math.abs(r)
  const s = a < 0.2 ? 'prácticamente nula' : a < 0.4 ? 'débil' : a < 0.7 ? 'moderada' : 'fuerte'
  return { s, dir: r >= 0 ? 'positiva' : 'negativa' }
}

export default function StudyPanel() {
  const ds = useStore((s) => s.dataset)
  const attrs = useStore((s) => s.attrs)
  const sel = useStore((s) => s.sel)
  const day = useStore((s) => dayOf(s.t))
  const goDay = useStore((s) => s.goDay)
  const setHover = useStore((s) => s.setHover)
  const [scope, setScope] = useState('day')
  const [hover, setLocalHover] = useState(-1)

  const xs = attrs.rest
  const ys = useMemo(() => ds.metrics.map((m) => (scope === 'week' ? m.bubAvg : m.bub[day])), [ds, day, scope])
  const reg = useMemo(() => linreg(xs, ys), [xs, ys])
  const st = strength(reg.r)
  const ranked = [...ys.keys()].filter((i) => ds.pop[i] >= 3).sort((a, b) => ys[b] - ys[a])
  const cityMax = Math.max(...ds.cityBub)

  const hoverIt = (i) => { setLocalHover(i); setHover(i >= 0 ? { i, x: -999, y: -999, fromChart: true } : null) }

  return (
    <>
      <section>
        <Segmented id="scope" label="Periodo" value={scope} onChange={setScope} options={[{ value: 'day', label: `${DAYS[day].name}` }, { value: 'week', label: 'Media L–V' }]} />
        <div style={{ marginTop: 12 }}>
          <Scatter xs={xs} ys={ys} reg={reg} sel={sel} hover={hover} onHover={hoverIt} onPick={(i) => selectBarrio(i)} xLabel="Restaurantes por 1.000 habitantes" yLabel="Viajes de 20 a 24 h que se quedan en el barrio" />
        </div>
        <motion.p key={`${scope}${day}`} className="note" style={{ color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.5 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Relación <b style={{ color: 'var(--ink)' }}>{st.s} y {st.dir}</b> (r = {reg.r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}).
          {Math.abs(reg.r) >= 0.2 && (reg.r > 0
            ? ` Por cada 5 restaurantes más por 1.000 habitantes, se queda en el barrio un ${Math.round(reg.slope * 5 * 100)} % más de los viajes nocturnos.`
            : ' Los barrios con más oferta retienen menos a su gente: atraen a la de fuera.')}
        </motion.p>
      </section>

      <section>
        <div className="section-title"><h3>La burbuja de la ciudad, día a día</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, alignItems: 'end', height: 120 }}>
          {ds.cityBub.map((v, k) => (
            <button key={k} onClick={() => goDay(k)} style={{ display: 'grid', gap: 4, justifyItems: 'center', alignSelf: 'stretch', alignContent: 'end' }} aria-label={`${DAYS[k].name}: ${pct(v)}`}>
              <span className="num" style={{ fontSize: 11, color: 'var(--ink-2)' }}>{pct(v)}</span>
              <motion.span style={{ width: '100%', borderRadius: '8px 8px 3px 3px', background: DAYS[k].hue, opacity: k === day ? 1 : 0.55, boxShadow: k === day ? '0 0 0 2px var(--ink)' : 'none' }} initial={{ height: 0 }} animate={{ height: (v / cityMax) * 74 }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: k * 0.05 }} />
              <span className="serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1, color: DAYS[k].hue }}>{DAYS[k].key}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[['Más cerradas', ranked.slice(0, 5)], ['Más abiertas', ranked.slice(-5).reverse()]].map(([title, list]) => (
          <div key={title}>
            <div className="section-title"><h3>{title}</h3></div>
            <div className="list">
              {list.map((i, k) => (
                <motion.button key={i} className="row" style={{ minHeight: 36, padding: '6px 8px' }} onClick={() => selectBarrio(i)} onPointerEnter={() => hoverIt(i)} onPointerLeave={() => hoverIt(-1)} {...stagger(k)}>
                  <span className="txt"><b style={{ fontSize: 12.5 }}>{BARRIOS[i].short}</b></span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{pct(ys[i])}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <p className="note">
          <b>Índice de burbuja:</b> de todos los viajes que salen de un barrio entre las 20 y las 24 h, la parte que termina dentro del mismo barrio.
          Los restaurantes por habitante son {ds.source.kind === 'simulado' ? 'una estimación simulada' : 'los del fichero que has importado o la estimación por defecto'}; cárgalos reales desde el panel Datos.
        </p>
      </section>
    </>
  )
}
