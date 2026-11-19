import { NextAction, StageBadge } from '../components/Cards'
import { Empty, Head } from '../components/common'
import { update, useAppState } from '../lib/store'
import {
  ACTIVE_STAGES,
  addDays,
  appLabel,
  daysSince,
  daysUntil,
  downloadText,
  fmtDateTime,
  icsEvent,
  isoDate,
  relDay,
  safeName,
  setStage,
  silentApps,
  STAGES,
  stats,
  uid,
} from '../lib/utils'
import type { Application } from '../types'
import { useUI } from '../ui'

function markDone(a: Application) {
  update((d) => {
    const x = d.apps.find((y) => y.id === a.id)
    if (!x) return
    x.events.push({ id: uid(), t: Date.now(), type: 'followup', text: `Hecho: ${x.nextAction || 'siguiente paso'}` })
    const done = x.nextAction
    x.nextAction = ''
    x.nextDate = ''
    return `✓ ${appLabel(x)}: ${done || 'siguiente paso'}`
  })
}

function snooze(a: Application, days: number) {
  update((d) => {
    const x = d.apps.find((y) => y.id === a.id)
    if (x) x.nextDate = addDays(days)
  })
}

export function Hoy() {
  const s = useAppState()
  const { open, go } = useUI()
  const today = isoDate()
  const now = Date.now()
  const st = stats(s)

  const due = s.apps
    .filter((a) => STAGES[a.stage].active && a.nextDate && a.nextDate <= addDays(2))
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate) || b.priority - a.priority)
  const interviews = s.apps
    .flatMap((a) => a.events.filter((e) => e.type === 'interview' && e.at && new Date(e.at).getTime() >= now - 2 * 3600_000).map((e) => ({ a, e })))
    .sort((x, y) => x.e.at!.localeCompare(y.e.at!))
  const deadlines = s.apps
    .filter((a) => (a.stage === 'wishlist' || a.stage === 'preparing') && a.deadline && daysUntil(a.deadline) <= 7)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
  const silent = silentApps(s)
  const maxCount = Math.max(1, ...ACTIVE_STAGES.map((k) => s.apps.filter((a) => a.stage === k).length))

  if (!s.apps.length)
    return (
      <>
        <Head title="Hola 👋" sub="Todas tus postulaciones (trabajos y tesis) en un solo lugar. La app se acuerda de los follow-ups por ti." />
        <Empty icon="🗂️">
          <b>Empieza agregando dónde ya postulaste</b>, aunque sea solo empresa y puesto.
          <br />
          ¿Ya tienes un Excel o Google Sheet? Impórtalo como CSV.
          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => open({ kind: 'app' })}>
              ✚ Agregar postulación
            </button>
            <button className="btn" onClick={() => open({ kind: 'import' })}>
              📥 Importar CSV
            </button>
          </div>
        </Empty>
      </>
    )

  return (
    <>
      <Head title="Hola 👋" sub="Lo que necesita tu atención. Lo demás puede esperar." />
      <div className="grid g2">
        <div className="card">
          <h2>⏰ Para hoy</h2>
          {due.length ? (
            due.map((a) => (
              <div key={a.id} className="agenda-row">
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => open({ kind: 'app', id: a.id })}>
                  <div className="t">{appLabel(a)}</div>
                  <NextAction a={a} />
                </div>
                <div className="row" style={{ flex: '0 0 auto', gap: 4 }}>
                  <button className="btn sm" title="Marcar como hecho" onClick={() => markDone(a)}>
                    ✓ Hecho
                  </button>
                  <button className="btn sm ghost" title="Posponer 3 días" onClick={() => snooze(a, 3)}>
                    +3 d
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="meta">Nada pendiente para hoy ni mañana. 🎉</div>
          )}
        </div>

        <div className="card">
          <h2>🗣️ Próximas entrevistas</h2>
          {interviews.length ? (
            interviews.map(({ a, e }) => (
              <div key={e.id} className="agenda-row">
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => open({ kind: 'app', id: a.id, tab: 'historial' })}>
                  <div className="t">{appLabel(a)}</div>
                  <div className="meta">
                    📅 {fmtDateTime(e.at!)}
                    {e.text && ` · ${e.text}`}
                  </div>
                </div>
                <button
                  className="btn sm ghost"
                  title="Añadir a mi calendario (.ics)"
                  onClick={() => downloadText(`entrevista-${safeName(a.company)}.ics`, icsEvent(`Entrevista: ${appLabel(a)}`, e.at!, 60, e.text, a.url), 'text/calendar')}
                >
                  📅 .ics
                </button>
              </div>
            ))
          ) : (
            <div className="meta">Ninguna agendada. Cuando te inviten, agrégala en el historial de la postulación.</div>
          )}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>📌 Ojo con esto</h2>
          {!deadlines.length && !silent.length && <div className="meta">Sin deadlines cerca ni postulaciones olvidadas.</div>}
          {deadlines.map((a) => {
            const n = daysUntil(a.deadline)
            return (
              <div key={a.id} className="agenda-row" style={{ cursor: 'pointer' }} onClick={() => open({ kind: 'app', id: a.id })}>
                <div style={{ flex: 1 }}>
                  <div className="t">{appLabel(a)}</div>
                  <div className={'meta' + (n < 0 ? ' overdue' : n <= 2 ? ' due-today' : '')}>
                    🗓️ Deadline {relDay(a.deadline)} · <StageBadge a={a} />
                  </div>
                </div>
              </div>
            )
          })}
          {silent.map((a) => (
            <div key={a.id} className="agenda-row">
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => open({ kind: 'app', id: a.id })}>
                <div className="t">{appLabel(a)}</div>
                <div className="meta">👻 {daysSince(a.stageAt)} días sin respuesta</div>
              </div>
              <div className="row" style={{ flex: '0 0 auto', gap: 4 }}>
                <button
                  className="btn sm"
                  onClick={() =>
                    update((d) => {
                      const x = d.apps.find((y) => y.id === a.id)!
                      x.nextAction = 'Último follow-up'
                      x.nextDate = today
                      return `Follow-up para ${appLabel(x)}`
                    })
                  }
                >
                  Follow-up
                </button>
                <button className="btn sm ghost" onClick={() => update((d) => setStage(d.apps.find((y) => y.id === a.id)!, 'ghosted'))}>
                  👻 Cerrar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>📈 Cómo vas</h2>
          <div className="row" style={{ textAlign: 'center', marginBottom: 14 }}>
            <div>
              <div className="stat">{st.thisWeek}</div>
              <div className="meta">postulaciones esta semana</div>
            </div>
            <div>
              <div className="stat">{st.applied ? `${st.responseRate}%` : '—'}</div>
              <div className="meta">te respondieron</div>
            </div>
            <div>
              <div className="stat">{st.interviews}</div>
              <div className="meta">en entrevistas</div>
            </div>
          </div>
          <div className="funnel">
            {ACTIVE_STAGES.map((k) => {
              const n = s.apps.filter((a) => a.stage === k).length
              return (
                <div key={k} className="funnel-row" onClick={() => go('tablero')}>
                  <span className="funnel-label">
                    {STAGES[k].icon} {STAGES[k].label}
                  </span>
                  <span className="funnel-bar">
                    <span style={{ width: `${(n / maxCount) * 100}%`, background: STAGES[k].color }} />
                  </span>
                  <span className="funnel-n">{n}</span>
                </div>
              )
            })}
          </div>
          <div className="tip">
            Tip: postular es un juego de volumen <b>y</b> de seguimiento. Cuando marcas “Postulé”, la app agenda sola un follow-up en 7 días.
          </div>
        </div>
      </div>
    </>
  )
}
