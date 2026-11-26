// Printable report of one barrio: a native <dialog> (focus, Esc and top layer for free) that the browser
// saves as a PDF. Everything in it comes from the same Telefónica data as the map.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { useStore } from '../store.js'
import { BARRIOS } from '../model/geo.js'
import { topFrom, topTo } from '../model/derive.js'
import { BUSINESSES, siteScores, visitorShareOf } from '../model/tools.js'
import { DAYS, SEGMENT_COLORS } from '../lib/colors.js'
import { fmt, fmtK, pct } from '../lib/format.js'
import { dayOf } from '../lib/week.js'
import { snapshotBarrio } from '../engine/mapEngine.js'

const WHO = { Residente: 'Residentes', Regional: 'Resto de Cataluña', Nacional: 'Resto de España', Internacional: 'Extranjero' }

function Content({ i, shot }) {
  const ds = useStore((s) => s.dataset)
  const day = useStore((s) => dayOf(s.t))
  const periods = useStore((s) => s.periods)
  const period = useStore((s) => s.period)
  const b = BARRIOS[i]
  const m = ds.metrics[i]
  const week = DAYS.map((d, t) => ({ name: d.name, v: ds.ARR[t][i] }))
  const wmax = Math.max(...week.map((w) => w.v)) || 1
  const avg = week.reduce((a, w) => a + w.v, 0) / week.length
  const comp = ds.segArr ? Object.keys(ds.segArr).map((n) => ({ n, v: ds.segArr[n].reduce((a, d) => a + d[i], 0) })) : null
  const compTot = comp ? comp.reduce((a, c) => a + c.v, 0) : 0
  const from = topTo(ds, i, day, 5)
  const to = topFrom(ds, i, day, 5)
  const vis = visitorShareOf(ds, day, 'all')
  const fit = useMemo(() => BUSINESSES.map((bz) => {
    const r = siteScores(ds, bz.key)
    return { bz, score: r.score[i], pos: r.order.indexOf(i) + 1, of: r.order.length }
  }), [ds, i])
  const periodLabel = periods.find((p) => p.id === period)?.label || 'Todos los meses'
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <article className="rp">
      <header className="rp-head">
        <div>
          <p className="rp-eyebrow">Informe de barrio · {b.district}</p>
          <h2 id="report-title">{b.name}</h2>
          <p className="rp-tag">{m.tag.label}. {m.tag.text}</p>
        </div>
        <div className="rp-brand"><b>Baburu</b><span>{periodLabel}</span><span>{today}</span></div>
      </header>

      {shot && <img className="rp-shot" src={shot} alt={`Vista 3D de ${b.name} en el mapa de movilidad`} width="1600" height="700" />}

      <section className="rp-kpis">
        <div><b>{fmtK(avg)}</b><span>llegadas en un día laborable medio</span></div>
        <div><b>{vis ? pct(vis[i]) : '—'}</b><span>de quien llega viene de fuera de Barcelona ({DAYS[day].name.toLowerCase()})</span></div>
        <div><b>{DAYS[m.peak].name}</b><span>el día con más llegadas ({fmtK(m.max)})</span></div>
      </section>

      <div className="rp-grid">
        <section>
          <h3>La semana</h3>
          <ul className="rp-week">
            {week.map((w) => (
              <li key={w.name}><span>{w.name.slice(0, 3)}</span><i style={{ '--k': w.v / wmax }} /><b>{fmtK(w.v)}</b></li>
            ))}
          </ul>
        </section>
        {comp && compTot > 0 && (
          <section>
            <h3>Quién llega</h3>
            <div className="rp-comp">{comp.map((c) => <i key={c.n} style={{ flexGrow: c.v / compTot, background: SEGMENT_COLORS[c.n] }} />)}</div>
            <ul className="rp-legend">{comp.map((c) => <li key={c.n}><i style={{ background: SEGMENT_COLORS[c.n] }} />{WHO[c.n] || c.n}<b>{pct(c.v / compTot)}</b></li>)}</ul>
          </section>
        )}
        <section>
          <h3>De dónde viene la gente <small>{DAYS[day].name}</small></h3>
          <ol className="rp-list">{from.map((o) => <li key={o.j}><span>{BARRIOS[o.j].name}</span><b>{fmt(o.v)}</b></li>)}</ol>
        </section>
        <section>
          <h3>Adónde va su gente <small>{DAYS[day].name}</small></h3>
          <ol className="rp-list">{to.map((o) => <li key={o.j}><span>{BARRIOS[o.j].name}</span><b>{fmt(o.v)}</b></li>)}</ol>
        </section>
      </div>

      <section className="rp-fit">
        <h3>Encaje para abrir un negocio</h3>
        <table>
          <thead><tr><th scope="col">Tipo de negocio</th><th scope="col">Nota</th><th scope="col">Puesto</th></tr></thead>
          <tbody>
            {fit.map((f) => (
              <tr key={f.bz.key}><th scope="row">{f.bz.label}</th><td><b>{Math.round(f.score * 100)}</b> / 100</td><td>{f.pos ? `${f.pos} de ${f.of}` : '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="rp-foot">
        Datos de movilidad de Telefónica: viajes entre los 73 barrios de Barcelona, media de los días laborables del periodo. La nota de cada negocio compara este barrio con el resto, indicador a indicador. Generado con Baburu.
      </footer>
    </article>
  )
}

export default function Report() {
  const i = useStore((s) => s.report)
  const ref = useRef(null)
  const [shot, setShot] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (i >= 0) {
      setReady(false)
      setShot(null)
      if (!dlg.open) dlg.showModal()
      let alive = true
      snapshotBarrio(i).then((url) => { if (alive) { setShot(url); setReady(true) } })
      return () => { alive = false }
    }
    if (dlg.open) dlg.close()
  }, [i])

  return createPortal(
    <dialog ref={ref} className="report" closedby="any" aria-labelledby="report-title" onClose={() => useStore.setState({ report: -1 })}>
      <div className="report-actions">
        <button className="btn" onClick={() => window.print()} disabled={!ready}><Printer aria-hidden="true" /> Guardar como PDF</button>
        <button className="icon-btn" onClick={() => ref.current?.close()} aria-label="Cerrar informe"><X /></button>
      </div>
      {i >= 0 && !ready && (
        <div className="report-wait">
          <label htmlFor="report-progress">Preparando el informe de {BARRIOS[i].name}…</label>
          <progress id="report-progress" />
        </div>
      )}
      {i >= 0 && ready && <Content i={i} shot={shot} />}
    </dialog>,
    document.body,
  )
}
