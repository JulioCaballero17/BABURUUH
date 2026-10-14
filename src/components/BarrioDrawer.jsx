import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, GitCompareArrows, LocateFixed, Waypoints } from 'lucide-react'
import { useStore, selectDark } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { topFrom, topTo } from '../model/derive.js'
import { DAYS } from '../lib/colors.js'
import { fmt, fmtK, pct, signedPct } from '../lib/format.js'
import { dayOf, clockText } from '../lib/week.js'
import { dnaAxes } from '../lib/dna.js'
import { selectBarrio, flyTo } from '../engine/mapEngine.js'
import { AnimatedNumber, Segmented, stagger } from './ui/primitives.jsx'
import WeekHeatmap from './charts/WeekHeatmap.jsx'
import Radar from './charts/Radar.jsx'

const drawerMotion = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 240, damping: 30 } },
  exit: { opacity: 0, x: 30, transition: { duration: 0.18 } },
}

function Body({ i }) {
  const ds = useStore((s) => s.dataset)
  const tq = useStore((s) => Math.floor(s.t * 4) / 4)
  const th = Math.floor(tq)
  const day = dayOf(tq)
  const goTo = useStore((s) => s.goTo)
  const openCompare = useStore((s) => s.openCompare)
  const setHover = useStore((s) => s.setHover)
  const colorMode = useStore((s) => s.colorMode)
  const influenceDir = useStore((s) => s.influenceDir)
  const dark = useStore(selectDark)
  const [dir, setDir] = useState('out')
  const b = BARRIOS[i]
  const m = ds.metrics[i]

  const series = useMemo(() => ds.ARR.map((a) => a[i]), [ds, i])
  const axes = useMemo(() => dnaAxes(ds, i), [ds, i])
  const arrNow = ds.ARR[th][i] * (1 - (tq - th)) + ds.ARR[(th + 1) % 120][i] * (tq - th)
  const arrMon = ds.ARR[th % 24][i]
  const list = dir === 'out' ? topFrom(ds, i, th, 5) : topTo(ds, i, th, 5)
  const Ft = ds.F[th]
  let outTot = 0
  for (let j = 0; j < 73; j++) outTot += dir === 'out' ? Ft[i * 73 + j] : Ft[j * 73 + i]
  const stay = Ft[i * 73 + i]
  const vmax = Math.max(stay, list[0]?.v || 0) || 1
  const hue = dark ? DAYS[day].hue : DAYS[day].hueLight
  const influenceOn = colorMode === 'influence'

  const setInfluence = () => {
    const s = useStore.getState()
    if (influenceOn && s.influenceDir === dir) s.setColorMode('activity')
    else { s.setInfluenceDir(dir); s.setColorMode('influence') }
  }

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
          <button className="btn sm" onClick={() => openCompare()}><GitCompareArrows /> Comparar</button>
          <button className="btn sm" aria-pressed={influenceOn && influenceDir === dir} onClick={setInfluence}><Waypoints /> {influenceOn && influenceDir === dir ? 'Quitar influencia' : 'Ver influencia'}</button>
          <button className="btn sm ghost" onClick={() => flyTo({ center: b.c, zoom: 14.4, pitch: 66 }, 1800)}><LocateFixed /> Acercar</button>
        </div>
      </div>

      <div className="panel-body" style={{ paddingTop: 16 }}>
        <div className="kpis">
          <motion.div className="kpi" {...stagger(0)}>
            <div className="v"><AnimatedNumber value={arrNow} format={fmtK} /></div>
            <div className="l">llegadas/h ahora</div>
            {day > 0 && arrMon > 0 && <div className="d" style={{ color: arrNow >= arrMon ? 'var(--good)' : 'var(--warn)' }}>{signedPct(arrNow / arrMon - 1)} vs lunes</div>}
          </motion.div>
          <motion.div className="kpi" {...stagger(1)}>
            <div className="v">{pct(m.bub[day])}</div>
            <div className="l">burbuja del {DAYS[day].name.toLowerCase()}</div>
            <div className="d" style={{ color: 'var(--ink-3)' }}>ciudad {pct(ds.cityBub[day])}</div>
          </motion.div>
          <motion.div className="kpi" {...stagger(2)}>
            <div className="v">{DAYS[Math.floor(m.peak / 24)].short} {m.peak % 24}h</div>
            <div className="l">pico de la semana</div>
            <div className="d" style={{ color: 'var(--ink-3)' }}>{fmtK(m.max)}/h</div>
          </motion.div>
        </div>

        <section>
          <div className="section-title"><h3>La semana, hora a hora</h3><span>toca una celda</span></div>
          <WeekHeatmap series={series} current={th} onPick={(t) => goTo(t + 0.5, 900)} label={`Llegadas a ${b.name} cada hora de lunes a viernes`} />
        </section>

        <section>
          <div className="section-title">
            <h3>{dir === 'out' ? 'Adónde va su gente' : 'De dónde viene'}</h3>
            <span>{DAYS[day].short} {clockText(tq)}</span>
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
            <div className="bar-row" style={{ cursor: 'default' }}>
              <span className="n" style={{ fontWeight: 600 }}>Sin salir del barrio</span>
              <span className="v">{fmt(stay)} · {pct(outTot ? stay / outTot : 0)}</span>
              <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: stay / vmax }} style={{ width: '100%', background: 'var(--ink)' }} /></span>
            </div>
          </div>
        </section>

        <section>
          <div className="section-title"><h3>Burbuja por día · 20–24 h</h3></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, alignItems: 'end', height: 96 }}>
            {m.bub.map((v, k) => {
              const mx = Math.max(...m.bub, ...ds.cityBub) || 1
              return (
                <div key={k} style={{ display: 'grid', gap: 4, justifyItems: 'center', alignContent: 'end', height: '100%', position: 'relative' }}>
                  <span className="num" style={{ fontSize: 11 }}>{pct(v)}</span>
                  <motion.span initial={{ height: 0 }} animate={{ height: (v / mx) * 56 }} transition={{ type: 'spring', stiffness: 140, damping: 20, delay: k * 0.04 }} style={{ width: '100%', borderRadius: '7px 7px 3px 3px', background: DAYS[k].hue, opacity: k === day ? 1 : 0.6 }} />
                  <span className="serif" style={{ fontStyle: 'italic', fontSize: 16, lineHeight: 1, color: DAYS[k].hue }}>{DAYS[k].key}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <div className="section-title"><h3>ADN del barrio</h3><span>discontinua: mediana de la ciudad</span></div>
          <div style={{ display: 'grid', placeItems: 'center' }}><Radar axes={axes} color={hue} size={236} /></div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            [fmt(ds.pop[i] * 1000), 'habitantes'],
            [ds.rest[i].toLocaleString('es-ES'), 'restaurantes por 1.000 hab.'],
            [b.area.toLocaleString('es-ES', { maximumFractionDigits: 2 }), 'km²'],
            [fmt((ds.pop[i] * 1000) / b.area), 'hab./km²'],
          ].map(([v, l]) => (
            <div key={l} className="kpi" style={{ padding: '8px 10px' }}>
              <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
              <div className="l">{l}</div>
            </div>
          ))}
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
        <motion.aside key="drawer" className="drawer glass" aria-label="Ficha del barrio" {...drawerMotion}>
          <Body i={sel} />
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
