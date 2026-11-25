import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, UtensilsCrossed, ShoppingBag, Briefcase, Store, Ticket, Construction, Laptop, MousePointerClick, TrainFront, ArrowRight } from 'lucide-react'
import { useStore } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { BUSINESSES, SCENARIOS, VISITOR_KINDS, visitorSeason } from '../model/tools.js'
import { getScores, getSim, getVisitors } from '../engine/toolState.js'
import { selectBarrio, setView, flyTo } from '../engine/mapEngine.js'
import { DAYS } from '../lib/colors.js'
import { fmt, fmtK, pct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'
import { panelMotion, stagger } from './ui/primitives.jsx'

const BIZ_ICON = { ocio: UtensilsCrossed, turista: ShoppingBag, trabajo: Briefcase, barrio: Store }
const SC_ICON = { evento: Ticket, cierre: Construction, teletrabajo: Laptop }

function Choice({ icon: Icon, title, desc, on, onClick, tour, compact = false }) {
  return (
    <button className="choice" aria-pressed={on} onClick={onClick} data-tour={tour}>
      <span className="choice-ico"><Icon aria-hidden="true" /></span>
      <span className="choice-txt"><b>{title}</b>{(on || !compact) && <small>{desc}</small>}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ Dónde abrir */
function AbrirPanel() {
  const business = useStore((s) => s.business)
  const setBusiness = useStore((s) => s.setBusiness)
  const ds = useStore((s) => s.dataset)
  const res = useMemo(() => getScores(useStore.getState()), [business, ds]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <section>
        <div className="section-title"><h3>¿Qué quieres abrir?</h3></div>
        <div className="choices" role="group" aria-label="Tipo de negocio">
          {BUSINESSES.map((b) => <Choice key={b.key} tour={`biz-${b.key}`} icon={BIZ_ICON[b.key]} title={b.label} desc={b.short} on={business === b.key} onClick={() => setBusiness(b.key)} />)}
        </div>
      </section>
      <section data-tour="podium">
        <div className="section-title"><h3>Los tres mejores barrios</h3><span>toca uno para verlo</span></div>
        <ol className="podium">
          {res.top.map((t, k) => (
            <motion.li key={`${business}-${t.i}`} {...stagger(k)}>
              <button onClick={() => selectBarrio(t.i)}>
                <span className="podium-rank" aria-label={`Puesto ${k + 1}`}>{k + 1}</span>
                <span className="podium-body">
                  <span className="podium-name">{BARRIOS[t.i].name}</span>
                  <span className="podium-dist">{BARRIOS[t.i].district}</span>
                  {t.why.length > 0 && <span className="podium-why">{t.why.map((w) => <i key={w}>{w}</i>)}</span>}
                </span>
                <span className="podium-score" title="Encaje del barrio (0–100)">{Math.round(t.score * 100)}</span>
              </button>
            </motion.li>
          ))}
        </ol>
        <p className="note" style={{ marginTop: 10 }}>{res.business.desc} Se calcula con cuánta gente llega, quién es y qué día viene, según los datos de movilidad.</p>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ Simulador */
function SimPanel() {
  const scenario = useStore((s) => s.scenario)
  const setScenario = useStore((s) => s.setScenario)
  const simPlace = useStore((s) => s.simPlace)
  const simAmount = useStore((s) => s.simAmount)
  const setSimPlace = useStore((s) => s.setSimPlace)
  const setSimAmount = useStore((s) => s.setSimAmount)
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  const sc = SCENARIOS.find((x) => x.key === scenario)
  const r = useMemo(() => getSim(useStore.getState()), [scenario, simPlace, simAmount, ds, day]) // eslint-disable-line react-hooks/exhaustive-deps
  const [live, setLive] = useState(r.amount)
  useEffect(() => setLive(r.amount), [r.amount, scenario])
  const dn = DAYS[day].name.toLowerCase()
  const place = r.place

  useEffect(() => {
    if (place >= 0) flyTo({ center: BARRIOS[place].c, zoom: 12.6, pitch: 58, bearing: -30 }, 1600)
  }, [place])

  let headline = null
  if (scenario === 'evento' && place >= 0) {
    const origins = r.flows.slice(0, 3).map((f) => BARRIOS[f.i].short)
    headline = (
      <>
        <p className="result-big"><b>+{fmtK(r.amount)}</b> personas llegan a {BARRIOS[place].short}</p>
        <p className="result-sub">Es un <b>{pct(r.change[place])} más</b> que un {dn} normal. Más gente sale de <b>{origins.join(', ')}</b>.</p>
      </>
    )
  } else if (scenario === 'cierre' && place >= 0) {
    const takers = r.flows.slice(0, 3).map((f) => BARRIOS[f.j].short)
    headline = (
      <>
        <p className="result-big"><b>{fmtK(r.base[place] - r.sim[place])}</b> viajes buscan otro destino</p>
        <p className="result-sub">Quien iba a {BARRIOS[place].short} acaba sobre todo en <b>{takers.join(', ')}</b>.</p>
      </>
    )
  } else if (scenario === 'teletrabajo') {
    headline = (
      <>
        <p className="result-big"><b>−{fmtK(-r.totalDelta)}</b> viajes un {dn}</p>
        <p className="result-sub">Los barrios que más se vacían son los de oficinas: <b>{r.losers.map((i) => BARRIOS[i].short).join(', ')}</b>.</p>
      </>
    )
  }

  return (
    <>
      <section>
        <div className="section-title"><h3>¿Qué pasa si…?</h3></div>
        <div className="choices" role="group" aria-label="Escenario">
          {SCENARIOS.map((x) => <Choice key={x.key} compact tour={`sc-${x.key}`} icon={SC_ICON[x.key]} title={x.label} desc={x.desc} on={scenario === x.key} onClick={() => setScenario(x.key)} />)}
        </div>
      </section>
      <section className="result" aria-live="polite" data-tour="sim-result">
        <motion.div key={`${scenario}-${place}-${r.amount}-${day}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {headline}
        </motion.div>
      </section>
      <section className="sim-ctl" data-tour="sim-ctl">
        {sc.place && (
          <div className="field">
            <label htmlFor="sim-place">Dónde</label>
            <select id="sim-place" className="select" value={place} onChange={(e) => setSimPlace(Number(e.target.value))}>
              {[...BARRIOS].sort((a, b) => a.name.localeCompare(b.name, 'es')).map((b) => <option key={b.i} value={b.i}>{b.name}</option>)}
            </select>
            <span className="hint"><MousePointerClick aria-hidden="true" /> También puedes hacer clic en el mapa</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="sim-amount">{sc.amount.label} <b>{sc.amount.fmt(live)}</b></label>
          <input id="sim-amount" type="range" className="range" min={sc.amount.min} max={sc.amount.max} step={sc.amount.step} value={live}
            onChange={(e) => setLive(Number(e.target.value))}
            onPointerUp={(e) => setSimAmount(Number(e.currentTarget.value))}
            onKeyUp={(e) => setSimAmount(Number(e.currentTarget.value))}
            style={{ '--p': `${((live - sc.amount.min) / (sc.amount.max - sc.amount.min)) * 100}%` }} />
        </div>
      </section>
      <p className="note">Simulación para un {dn} medio, a partir de los patrones reales de movilidad. Es una estimación, no una predicción.</p>
    </>
  )
}

/* ------------------------------------------------------------------ Turismo */
function Season({ summary, kind, period }) {
  const data = useMemo(() => visitorSeason(summary, kind), [summary, kind])
  const [hv, setHv] = useState(-1)
  if (!data) return <p className="note">Cargando la temporada…</p>
  const { months, vals } = data
  const max = Math.max(...vals) || 1
  const peak = vals.indexOf(max)
  const W = 340
  const H = 110
  const bw = W / months.length
  const k = hv >= 0 ? hv : peak
  return (
    <div className="season">
      <p className="season-read"><b>{months[k].label}</b> · {fmtK(vals[k])} visitantes al día{k === peak ? ' · el pico' : ''}</p>
      <svg viewBox={`0 0 ${W} ${H + 16}`} width="100%" role="img" aria-label={`Visitantes por mes. Pico en ${months[peak].label}.`} onPointerLeave={() => setHv(-1)}>
        {months.map((p, i) => {
          const h = Math.max(2, (vals[i] / max) * H)
          const on = period === p.id || (period.length === 4 && p.id.startsWith(period))
          return (
            <g key={p.id} onPointerEnter={() => setHv(i)} onClick={() => useStore.getState().setPeriod(p.id)} style={{ cursor: 'pointer' }}>
              <rect x={i * bw} y={0} width={bw} height={H + 16} fill="transparent" />
              <motion.rect x={i * bw + 1} width={bw - 2} rx={2} initial={{ height: 0, y: H }} animate={{ height: h, y: H - h }} transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.012 }}
                fill={i === k ? 'var(--accent)' : on ? 'var(--ink)' : 'var(--paper-3)'} />
              {p.id.endsWith('-01') && <text x={i * bw + 1} y={H + 13} className="season-year">{p.id.slice(0, 4)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function TurismoPanel() {
  const kind = useStore((s) => s.visitorKind)
  const setKind = useStore((s) => s.setVisitorKind)
  const summary = useStore((s) => s.summary)
  const period = useStore((s) => s.period)
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  const vis = useMemo(() => getVisitors(useStore.getState()), [kind, ds, day]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!summary) useStore.getState().loadSummary() }, [summary])
  if (!vis) return <p className="note">Estos datos no distinguen residentes de visitantes. Vuelve a los datos de Telefónica para usar Turismo.</p>
  const elig = BARRIOS.filter((b) => ds.ARR[day][b.i] >= 200).map((b) => b.i)
  const sorted = [...elig].sort((a, b) => vis.share[b] - vis.share[a])
  const tourist = sorted.slice(0, 5)
  const local = sorted.slice(-5).reverse()
  const Row = ({ i }) => (
    <button className="share-row" onClick={() => selectBarrio(i)}>
      <span className="n">{BARRIOS[i].short}</span>
      <span className="v">{pct(vis.share[i])}</span>
      <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: vis.share[i] }} /></span>
    </button>
  )
  return (
    <>
      <section>
        <div className="section-title"><h3>¿Qué visitantes?</h3></div>
        <div className="chips" role="group" aria-label="Tipo de visitante" data-tour="vis-kinds">
          {VISITOR_KINDS.map((k) => <button key={k.key} className="chip" aria-pressed={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</button>)}
        </div>
      </section>
      <section data-tour="season">
        <div className="section-title"><h3>La temporada</h3><span>toca un mes para verlo</span></div>
        {summary ? <Season summary={summary} kind={kind} period={period} /> : <p className="note">Cargando la temporada…</p>}
      </section>
      <section className="two-lists">
        <div>
          <div className="section-title"><h3>Más turísticos</h3></div>
          {tourist.map((i) => <Row key={i} i={i} />)}
        </div>
        <div>
          <div className="section-title"><h3>Más de vecinos</h3></div>
          {local.map((i) => <Row key={i} i={i} />)}
        </div>
      </section>
      <section>
        <button className="btn outline" style={{ width: '100%' }} data-tour="metro-visit" onClick={() => { setView('metro'); useStore.setState({ metroVariant: 'visit' }) }}>
          <TrainFront /> Ver el metro de los visitantes <ArrowRight />
        </button>
        <p className="note" style={{ marginTop: 8 }}>El plano de metro dibujado solo con los viajes de quien no vive en Barcelona.</p>
      </section>
    </>
  )
}

const META = {
  abrir: { eyebrow: 'Dónde abrir', title: 'El mejor barrio para tu negocio', C: AbrirPanel },
  simular: { eyebrow: 'Simulador', title: 'Qué pasaría si…', C: SimPanel },
  turismo: { eyebrow: 'Turismo', title: 'Adónde van los visitantes', C: TurismoPanel },
}

export default function ToolPanel() {
  const view = useStore((s) => s.view)
  const m = META[view]
  if (!m) return null
  return (
    <motion.aside key={view} className="side-panel glass" aria-label={m.eyebrow} data-tour="panel" initial={panelMotion.initial} animate={panelMotion.animate}>
      <div className="panel-head">
        <div>
          <p className="eyebrow">{m.eyebrow}</p>
          <h2>{m.title}</h2>
        </div>
        <button className="icon-btn" onClick={() => setView('mapa')} aria-label="Cerrar y volver a La semana"><X /></button>
      </div>
      <div className="panel-body">
        <m.C />
      </div>
    </motion.aside>
  )
}
