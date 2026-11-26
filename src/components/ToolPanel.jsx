import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, UtensilsCrossed, ShoppingBag, Briefcase, Store, Ticket, Construction, Laptop, MousePointerClick, TrainFront, ArrowRight, RotateCcw, Play, Pause } from 'lucide-react'
import { useStore } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { BUSINESSES, SCENARIOS, VISITOR_KINDS, visitorSeason, simulate, findBarrio } from '../model/tools.js'
import { getScores, getSim, getVisitors, catchment } from '../engine/toolState.js'
import { selectBarrio, setView, flyTo, replaySim } from '../engine/mapEngine.js'
import { DAYS } from '../lib/colors.js'
import { fmt, fmtK, pct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'
import { panelMotion, stagger, Segmented } from './ui/primitives.jsx'

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
  const sel = useStore((s) => s.sel)
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
      <Breakdown res={res} i={sel >= 0 ? sel : res.top[0]?.i} />
      <Customers focus={sel >= 0 ? sel : res.top[0]?.i} />
    </>
  )
}

// The mark of one barrio, indicator by indicator: nothing hidden, every point traceable to the data.
const RANK_TXT = (r) => (r >= 0.9 ? 'de los mejores' : r >= 0.66 ? 'por encima de la media' : r >= 0.33 ? 'en la media' : 'por debajo de la media')
function Breakdown({ res, i }) {
  if (i == null || !res.score[i]) return null
  const pos = res.order.indexOf(i) + 1
  const parts = res.detail(i)
  const maxW = Math.max(...parts.map((p) => p.w))
  return (
    <section data-tour="breakdown">
      <div className="section-title"><h3>Por qué {BARRIOS[i].short} saca un {Math.round(res.score[i] * 100)}</h3><span>puesto {pos} de {res.order.length}</span></div>
      <ul className="breakdown">
        {parts.map((p) => (
          <li key={p.k}>
            <div className="bd-head"><span>{p.txt[0].toUpperCase() + p.txt.slice(1)}</span><b>+{Math.round(p.pts * 100)}</b></div>
            <div className="bd-track" style={{ '--wt': p.w / maxW }} role="img" aria-label={`${RANK_TXT(p.rank)}: mejor que el ${Math.round(p.rank * 100)} % de los barrios`}>
              <i style={{ '--r': p.rank }} />
            </div>
            <div className="bd-foot"><span>Mejor que el {Math.round(p.rank * 100)} % de los barrios</span><span>pesa {Math.round(p.w * 100)} %</span></div>
          </li>
        ))}
      </ul>
      <details className="how">
        <summary>Cómo se calcula la nota</summary>
        <p>Para cada indicador ordenamos los {res.order.length} barrios con gente viviendo de peor a mejor: estar arriba del todo vale 1 y abajo del todo, 0. Así comparamos cosas distintas (personas por km², porcentajes, días) en la misma escala y un barrio extremo no lo distorsiona todo.</p>
        <p>La nota es la suma de cada posición por su peso, sobre 100. Los pesos los fijamos según lo que necesita cada tipo de negocio. Todo sale de los datos de movilidad de Telefónica, media de los días laborables del periodo elegido.</p>
      </details>
    </section>
  )
}

// Where the customers of a barrio would come from (the yellow comets on the map).
function Customers({ focus }) {
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  const list = useMemo(() => (focus == null ? [] : catchment(useStore.getState(), focus).slice(0, 5)), [focus, ds, day]) // eslint-disable-line react-hooks/exhaustive-deps
  if (focus == null) return null
  const max = list[0]?.v || 1
  return (
    <section data-tour="customers">
      <div className="section-title"><h3>De dónde vendrían tus clientes</h3><span>{DAYS[day].name}</span></div>
      <p className="note" style={{ marginBottom: 10 }}>A <b style={{ color: 'var(--ink)' }}>{BARRIOS[focus].short}</b> llega gente sobre todo de estos barrios. En el mapa, las líneas amarillas.</p>
      <div className="bars">
        {list.map((o) => (
          <div key={o.j} className="bar-row" onClick={() => selectBarrio(o.j)}>
            <span className="n">{BARRIOS[o.j].name}</span>
            <span className="v">{fmtK(o.v)} al día</span>
            <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: o.v / max }} style={{ width: '100%', background: 'var(--accent)' }} /></span>
          </div>
        ))}
      </div>
    </section>
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
  const nLines = useStore((s) => s.metroLines.length)
  const r = useMemo(() => getSim(useStore.getState()), [scenario, simPlace, simAmount, ds, day, nLines]) // eslint-disable-line react-hooks/exhaustive-deps
  const [live, setLive] = useState(r.amount)
  useEffect(() => setLive(r.amount), [r.amount, scenario])
  const dn = DAYS[day].name.toLowerCase()
  const place = r.place
  const simShow = useStore((s) => s.simShow)
  const setSimShow = useStore((s) => s.setSimShow)
  let impactList = []
  if (scenario === 'evento') {
    const mx = Math.abs(r.flows[0]?.v) || 1
    impactList = r.flows.slice(0, 5).map((f) => ({ i: f.i, k: Math.abs(f.v) / mx, label: `${fmtK(f.v)} personas` }))
  } else if (scenario === 'cierre') {
    const mx = Math.abs(r.flows[0]?.v) || 1
    impactList = r.flows.slice(0, 5).map((f) => ({ i: f.j, k: Math.abs(f.v) / mx, label: `+${pct(r.change[f.j])}` }))
  } else {
    const ls = [...r.change.keys()].filter((i) => r.base[i] > 300).sort((a, b) => r.change[a] - r.change[b]).slice(0, 5)
    const mx = Math.abs(r.change[ls[0]]) || 1
    impactList = ls.map((i) => ({ i, k: Math.abs(r.change[i]) / mx, label: `−${pct(-r.change[i])}`, neg: true }))
  }
  const lines = (r.lineImpact || []).filter((l) => Math.abs(l.change) >= 0.01).slice(0, 3)

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
        <p className="result-sub">Se pierde el {r.amount} % de los viajes de residentes hacia los barrios que reciben mucha más gente de la que vive (zonas de trabajo y estudio). Los que más se vacían: <b>{r.losers.map((i) => BARRIOS[i].short).join(', ')}</b>.</p>
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
        <div className="sim-compare">
          <Segmented id="sim-show" label="Comparar" value={simShow} onChange={setSimShow} options={[{ value: 'before', label: 'Un día normal' }, { value: 'after', label: 'Con el escenario' }]} />
          <button className="btn sm ghost" onClick={replaySim} title="Volver a ver la transición"><RotateCcw /> Repetir</button>
        </div>
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
      {impactList.length > 0 && (
        <section data-tour="sim-impact">
          <div className="section-title"><h3>{scenario === 'evento' ? 'De dónde sale la gente' : scenario === 'cierre' ? 'Adónde se desvía' : 'Barrios que más se vacían'}</h3></div>
          <div className="bars">
            {impactList.map((o) => (
              <div key={o.i} className="bar-row" onClick={() => selectBarrio(o.i)}>
                <span className="n">{BARRIOS[o.i].name}</span>
                <span className="v">{o.label}</span>
                <span className="track"><motion.i initial={{ scaleX: 0 }} animate={{ scaleX: o.k }} style={{ width: '100%', background: o.neg ? '#1F4FBF' : 'var(--accent)' }} /></span>
              </div>
            ))}
          </div>
        </section>
      )}
      {lines.length > 0 && (
        <section data-tour="sim-lines">
          <div className="section-title"><h3>Cómo afecta al metro de la demanda</h3></div>
          <ul className="impact-lines">
            {lines.map((l) => (
              <li key={l.id}>
                <span className="roundel" style={{ background: l.color, color: l.name === 'L4' ? '#17191C' : '#fff' }}>{l.name}</span>
                <span className="il-txt">{BARRIOS[l.from].short} ↔ {BARRIOS[l.to].short}</span>
                <span className={`il-v ${l.change < 0 ? 'neg' : ''}`}>{l.change >= 0 ? '+' : '−'}{Math.abs(Math.round(l.change * 100))} %</span>
              </li>
            ))}
          </ul>
          <p className="note" style={{ marginTop: 8 }}>Carga extra en cada línea del plano Metro, repartiendo los viajes del escenario por las rutas entre barrios vecinos. En el mapa brillan las rutas que más se cargan.</p>
        </section>
      )}
      <CompareScenarios scenario={scenario} place={place} amount={r.amount} day={day} ds={ds} />
      <p className="note">Simulación para un {dn} medio, a partir de los patrones reales de movilidad. Es una estimación, no una predicción.</p>
    </>
  )
}

// The three scenarios side by side: the current one with your settings, the others with their defaults.
function CompareScenarios({ scenario, place, amount, day, ds }) {
  const setScenario = useStore((s) => s.setScenario)
  const rows = useMemo(() => SCENARIOS.map((sc) => {
    const own = sc.key === scenario
    const pl = sc.place ? (own ? place : findBarrio(sc.place)) : -1
    const am = own ? amount : sc.amount.value
    const r = simulate(ds, sc.key, { place: pl, amount: am, day })
    const total = r.base.reduce((x, y) => x + y, 0) || 1
    const moved = r.allFlows.reduce((x, f) => x + Math.abs(f.v), 0)
    const cand = [...r.change.keys()].filter((i) => r.base[i] > 300)
    const top = cand.sort((x, y) => Math.abs(r.change[y]) - Math.abs(r.change[x]))[0]
    return { sc, own, pl, am, moved, share: moved / total, top, topChange: r.change[top] }
  }), [scenario, place, amount, day, ds])
  return (
    <details className="how" data-tour="sim-compare-all">
      <summary>Comparar los tres escenarios</summary>
      <table className="cmp">
        <caption className="sr-only">Comparación de escenarios para un {DAYS[day].name.toLowerCase()} medio</caption>
        <thead>
          <tr><th scope="col"><span className="sr-only">Indicador</span></th>{rows.map((x) => <th key={x.sc.key} scope="col" aria-current={x.own || undefined}>{x.sc.label}</th>)}</tr>
        </thead>
        <tbody>
          <tr><th scope="row">Ajuste</th>{rows.map((x) => <td key={x.sc.key}>{x.sc.amount.fmt(x.am)}{x.pl >= 0 && <small>{BARRIOS[x.pl].short}</small>}</td>)}</tr>
          <tr><th scope="row">Viajes que cambian</th>{rows.map((x) => <td key={x.sc.key}><b>{fmtK(x.moved)}</b><small>{pct(x.share, 1)} del día</small></td>)}</tr>
          <tr><th scope="row">Barrio más afectado</th>{rows.map((x) => <td key={x.sc.key}>{x.top != null ? <>{BARRIOS[x.top].short}<small className={x.topChange < 0 ? 'neg' : 'pos'}>{x.topChange >= 0 ? '+' : '−'}{pct(Math.abs(x.topChange))}</small></> : '—'}</td>)}</tr>
          <tr><td />{rows.map((x) => <td key={x.sc.key}>{x.own ? <span className="cmp-now">En el mapa</span> : <button className="btn sm ghost" onClick={() => setScenario(x.sc.key)}>Ver</button>}</td>)}</tr>
        </tbody>
      </table>
      <p className="note">El escenario activo usa tus ajustes; los otros, sus valores por defecto.</p>
    </details>
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
      <p className="note" style={{ margin: '-4px 0 8px' }}>Toca un mes para verlo en el mapa, o reprodúcelos todos.</p>
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

// Plays the months one after another so the map shows how tourism rises and falls through the year.
function SeasonPlay() {
  const periods = useStore((s) => s.periods)
  const [on, setOn] = useState(false)
  const timer = useRef(0)
  const months = periods.filter((p) => p.kind === 'month')
  useEffect(() => () => clearInterval(timer.current), [])
  const toggle = () => {
    if (on) { clearInterval(timer.current); setOn(false); return }
    const cur = months.findIndex((p) => p.id === useStore.getState().period)
    let k = cur >= 0 && cur < months.length - 1 ? cur + 1 : 0
    setOn(true)
    useStore.getState().setPeriod(months[k].id)
    timer.current = setInterval(() => {
      k++
      if (k >= months.length || useStore.getState().view !== 'turismo') { clearInterval(timer.current); setOn(false); return }
      useStore.getState().setPeriod(months[k].id)
    }, 1500)
  }
  if (!months.length) return null
  return <button className="btn sm" data-tour="season-play" onClick={toggle} aria-pressed={on}>{on ? <><Pause /> Pausar</> : <><Play /> Reproducir</>}</button>
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
        <div className="section-title"><h3>La temporada</h3><SeasonPlay /></div>
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
