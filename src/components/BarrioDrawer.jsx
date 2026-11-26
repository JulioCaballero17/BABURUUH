import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LocateFixed, FileText } from 'lucide-react'
import { useStore, selectDark } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { topFrom, topTo } from '../model/derive.js'
import { DAYS, SEGMENT_COLORS } from '../lib/colors.js'
import { segmentLabel } from '../model/realData.js'

const WHO = { Residente: 'Residentes', Regional: 'Resto de Cataluña', Nacional: 'Resto de España', Internacional: 'Extranjero' }
import Evolution from './charts/Evolution.jsx'
import { fmt, fmtK, pct, signedPct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'
import { selectBarrio, flyTo } from '../engine/mapEngine.js'
import { AnimatedNumber, Segmented, stagger } from './ui/primitives.jsx'

const drawerMotion = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 240, damping: 30 } },
  exit: { opacity: 0, x: 30, transition: { duration: 0.18 } },
}

function Body({ i }) {
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  const setHover = useStore((s) => s.setHover)
  const dark = useStore(selectDark)
  const summary = useStore((s) => s.summary)
  const segment = useStore((s) => s.segment)
  const period = useStore((s) => s.period)
  const dataState = useStore((s) => s.dataState)
  const [dir, setDir] = useState('out')
  useEffect(() => { if (!useStore.getState().summary && dataState !== 'csv') useStore.getState().loadSummary() }, [dataState])
  const b = BARRIOS[i]
  const m = ds.metrics[i]

  const arrNow = ds.ARR[day][i]
  const arrMon = ds.ARR[0][i]
  const list = dir === 'out' ? topFrom(ds, i, day, 5) : topTo(ds, i, day, 5)
  const Ft = ds.F[day]
  let outTot = 0
  for (let j = 0; j < 73; j++) outTot += dir === 'out' ? Ft[i * 73 + j] : Ft[j * 73 + i]
  const stay = Ft[i * 73 + i]
  const vmax = Math.max(stay, list[0]?.v || 0) || 1
  const hue = dark ? DAYS[day].hue : 'var(--ink)'
  const comp = ds.segArr ? Object.keys(ds.segArr).map((n) => ({ n, v: ds.segArr[n][day][i] })) : null
  const compTot = comp ? comp.reduce((a, c) => a + c.v, 0) : 0

  return (
    <>
      <div className="drawer-head">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p className="eyebrow">{b.district} · barrio {b.code}</p>
            <motion.h2 key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}>{b.name}</motion.h2>
          </div>
          <button className="icon-btn" onClick={() => selectBarrio(-1)} aria-label="Cerrar ficha"><X /></button>
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <span className="tag"><i />{m.tag.label}</span>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{m.tag.text}</span>
        </div>
        <div className="drawer-tools">
          <button className="btn sm ghost" onClick={() => flyTo({ center: b.c, zoom: 14.4, pitch: 66 }, 1800)}><LocateFixed /> Acercar</button>
          <button className="btn sm ghost" data-tour="report-btn" onClick={() => useStore.setState({ report: i })}><FileText /> Informe PDF</button>
        </div>
      </div>

      <div className="panel-body" style={{ paddingTop: 16 }}>
        <div className="kpis">
          <motion.div className="kpi" {...stagger(0)}>
            <div className="v"><AnimatedNumber value={arrNow} format={fmtK} /></div>
            <div className="l">llegadas el {DAYS[day].name.toLowerCase()}</div>
            {day > 0 && arrMon > 0 && <div className="d" style={{ color: arrNow >= arrMon ? 'var(--good)' : 'var(--warn)' }}>{signedPct(arrNow / arrMon - 1)} vs lunes</div>}
          </motion.div>
          {ds.hasStays || !comp ? (
            <motion.div className="kpi" {...stagger(1)}>
              <div className="v">{pct(m.bub[day])}</div>
              <div className="l">burbuja del {DAYS[day].name.toLowerCase()}</div>
              <div className="d" style={{ color: 'var(--ink-3)' }}>ciudad {pct(ds.cityBub[day])}</div>
            </motion.div>
          ) : (
            <motion.div className="kpi" {...stagger(1)}>
              <div className="v">{pct(compTot ? 1 - (comp.find((c) => c.n === 'Residente')?.v || 0) / compTot : 0)}</div>
              <div className="l">de quien llega es visitante</div>
              <div className="d" style={{ color: 'var(--ink-3)' }}>de fuera de Barcelona</div>
            </motion.div>
          )}
          <motion.div className="kpi" {...stagger(2)}>
            <div className="v">{DAYS[m.peak].name}</div>
            <div className="l">día con más llegadas</div>
            <div className="d" style={{ color: 'var(--ink-3)' }}>{fmtK(m.max)}</div>
          </motion.div>
        </div>

        {dataState !== 'csv' && (
          <section data-tour="drawer-evo">
            <div className="section-title"><h3>Evolución mes a mes</h3><span>llegadas por día laborable</span></div>
            {summary ? (
              <Evolution summary={summary} i={i} segment={segment} period={period} onPick={(id) => useStore.getState().setPeriod(id)} />
            ) : <p className="note">Cargando la serie mensual…</p>}
            <p className="note" style={{ marginTop: 6 }}>{period !== 'all' ? 'Franja amarilla: el periodo que estás viendo. ' : ''}Haz clic en un mes para cargarlo.{segment !== 'all' ? ` Solo ${segmentLabel(segment).toLowerCase()}.` : ''}</p>
          </section>
        )}

        {comp && compTot > 0 && (
          <section data-tour="drawer-who">
            <div className="section-title"><h3>Quién llega</h3><span>{DAYS[day].name}</span></div>
            <div className="comp-bar" role="img" aria-label={comp.map((c) => `${segmentLabel(c.n)} ${pct(c.v / compTot)}`).join(', ')}>
              {comp.map((c) => <motion.i key={c.n} initial={false} animate={{ flexGrow: c.v / compTot }} style={{ flexBasis: 0, background: SEGMENT_COLORS[c.n] }} transition={{ type: 'spring', stiffness: 160, damping: 24 }} />)}
            </div>
            <div className="comp-legend">
              {comp.map((c) => <span key={c.n}><i style={{ background: SEGMENT_COLORS[c.n] }} />{WHO[c.n] || c.n}<b>{pct(c.v / compTot)}</b></span>)}
            </div>
          </section>
        )}

        <section data-tour="drawer-flows">
          <div className="section-title">
            <h3>{dir === 'out' ? 'Adónde va su gente' : 'De dónde viene'}</h3>
            <span>{DAYS[day].name}</span>
          </div>
          <Segmented id="dir-drawer" label="Dirección" value={dir} onChange={setDir} options={[{ value: 'out', label: 'Salidas' }, { value: 'in', label: 'Llegadas' }]} />
          <div className="bars" style={{ marginTop: 12 }}>
            {list.map((o) => (
              <div key={o.j} className="bar-row" onClick={() => selectBarrio(o.j)} onPointerEnter={() => setHover({ i: o.j, x: -999, y: -999, fromChart: true })} onPointerLeave={() => setHover(null)}>
                <span className="n">{BARRIOS[o.j].name}</span>
                <span className="v">{fmt(o.v)} · {pct(outTot ? o.v / outTot : 0)}</span>
                <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: o.v / vmax }} style={{ width: '100%' }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} /></span>
              </div>
            ))}
            {ds.hasStays && <div className="bar-row" style={{ cursor: 'default' }}>
              <span className="n" style={{ fontWeight: 600 }}>Sin salir del barrio</span>
              <span className="v">{fmt(stay)} · {pct(outTot ? stay / outTot : 0)}</span>
              <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: stay / vmax }} style={{ width: '100%', background: 'var(--ink-3)' }} /></span>
            </div>}
          </div>
        </section>

      </div>
    </>
  )
}

export default function BarrioDrawer() {
  const sel = useStore((s) => s.sel)
  return (
    <AnimatePresence>
      {sel >= 0 && (
        <motion.aside key="drawer" className="drawer glass" aria-label="Ficha del barrio" data-tour="drawer" {...drawerMotion}>
          <Body i={sel} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
