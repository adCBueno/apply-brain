import { useState } from 'react'
import { ConfirmButton, CopyButton, Modal } from '../components/common'
import { StageBadge } from '../components/Cards'
import { update, useAppState } from '../lib/store'
import {
  addDays,
  appLabel,
  downloadText,
  fmtDate,
  fmtDateTime,
  icsAllDay,
  icsEvent,
  KINDS,
  newApp,
  safeName,
  sameCompany,
  setStage,
  STAGES,
  uid,
} from '../lib/utils'
import type { AppEvent, Application, EventType, Kind, Stage, WorkMode } from '../types'
import { useUI, type AppTab } from '../ui'

const TABS: [AppTab, string][] = [
  ['detalles', 'Detalles'],
  ['descripcion', 'Descripción'],
  ['enviado', 'Lo que envié'],
  ['historial', 'Historial'],
  ['contactos', 'Contactos'],
]

const EVENT_TYPES: Record<EventType, string> = {
  note: '📝 Nota',
  email: '✉️ Email / mensaje',
  interview: '🗣️ Entrevista',
  followup: '🔁 Follow-up',
  stage: '➡️ Etapa',
}

export function AppModal({ id, stage, tab }: { id?: string; stage?: Stage; tab?: AppTab }) {
  const st = useAppState()
  const { close } = useUI()
  const existing = id ? st.apps.find((a) => a.id === id) : undefined
  const [f, setF] = useState<Application>(() => (existing ? structuredClone(existing) : newApp({ stage: stage || 'wishlist' })))
  const [t, setT] = useState<AppTab>(tab || 'detalles')
  const [err, setErr] = useState(false)
  const [ev, setEv] = useState<{ type: EventType; text: string; at: string }>({ type: 'note', text: '', at: '' })
  const [newContact, setNewContact] = useState({ name: '', title: '' })
  const set = <K extends keyof Application>(k: K, v: Application[K]) => setF((p) => ({ ...p, [k]: v }))

  if (id && !existing) return null
  const dupes = sameCompany(st, f.company, f.id)

  const save = () => {
    if (!f.company.trim() && !f.role.trim()) {
      setErr(true)
      setT('detalles')
      return
    }
    update((d) => {
      const isNew = !d.apps.some((a) => a.id === f.id)
      const prev = d.apps.find((a) => a.id === f.id)
      const targetStage = f.stage
      // Keep the previous stage on the draft so setStage can apply its side effects.
      const next: Application = { ...f, company: f.company.trim(), role: f.role.trim(), stage: prev ? prev.stage : 'wishlist' }
      if (isNew) {
        next.events = [{ id: uid(), t: Date.now(), type: 'note', text: 'Agregada' }, ...next.events]
        d.apps.push(next)
      } else d.apps[d.apps.findIndex((a) => a.id === f.id)] = next
      const stageMsg = setStage(next, targetStage)
      if (isNew) return `Agregaste ${appLabel(next)}${stageMsg ? ` (${STAGES[targetStage].label})` : ''}`
      return stageMsg || `Editaste ${appLabel(next)}`
    })
    close()
  }

  const addEvent = () => {
    if (!ev.text.trim() && !ev.at) return
    const e: AppEvent = { id: uid(), t: Date.now(), type: ev.type, text: ev.text.trim(), ...(ev.type === 'interview' && ev.at ? { at: ev.at } : {}) }
    setF((p) => {
      const n = { ...p, events: [...p.events, e] }
      // An interview invitation implies the "Entrevistas" stage.
      if (ev.type === 'interview' && STAGES[p.stage].active && ['wishlist', 'preparing', 'applied', 'screening'].includes(p.stage)) n.stage = 'interview'
      return n
    })
    setEv({ type: 'note', text: '', at: '' })
  }

  const ics = (e: AppEvent) => downloadText(`entrevista-${safeName(f.company)}.ics`, icsEvent(`Entrevista: ${appLabel(f)}`, e.at!, 60, e.text, f.url), 'text/calendar')

  return (
    <Modal wide>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>{existing ? appLabel(existing) : 'Nueva postulación'}</h2>
          {existing && (
            <div className="meta" style={{ marginTop: 4 }}>
              <StageBadge a={existing} /> {existing.appliedAt && `· postulaste el ${fmtDate(existing.appliedAt)}`}
            </div>
          )}
        </div>
        {f.url && (
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn sm" style={{ flex: '0 0 auto' }}>
            Abrir anuncio ↗
          </a>
        )}
      </div>

      {dupes.length > 0 && (
        <div className="banner" style={{ margin: '12px 0 0' }}>
          ⚠️ Ya tienes {dupes.length === 1 ? 'otra postulación' : `${dupes.length} postulaciones`} en <b>{f.company}</b>:{' '}
          {dupes.map((a) => `${a.role || 'sin puesto'} (${STAGES[a.stage].label})`).join(', ')}
        </div>
      )}

      <div className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={t === k ? 'on' : ''} onClick={() => setT(k)}>
            {label}
            {k === 'descripcion' && f.jd && ' ✓'}
            {k === 'enviado' && (f.cvVersion || f.coverLetter) && ' ✓'}
            {k === 'historial' && f.events.length > 0 && ` (${f.events.length})`}
            {k === 'contactos' && f.contactIds.length > 0 && ` (${f.contactIds.length})`}
          </button>
        ))}
      </div>

      {t === 'detalles' && (
        <>
          <div className="row">
            <div>
              <label className="f">Empresa</label>
              <input autoFocus={!existing} value={f.company} onChange={(e) => set('company', e.target.value)} placeholder="Ej: Ericsson" style={err ? { borderColor: '#c0392b' } : undefined} />
            </div>
            <div>
              <label className="f">Puesto / tema de tesis</label>
              <input value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="Ej: iOS Engineer" />
            </div>
          </div>
          {err && <div className="err">Pon al menos la empresa o el puesto.</div>}
          <div className="row">
            <div>
              <label className="f">Tipo</label>
              <select value={f.kind} onChange={(e) => set('kind', e.target.value as Kind)}>
                {(Object.keys(KINDS) as Kind[]).map((k) => (
                  <option key={k} value={k}>
                    {KINDS[k][0]} {KINDS[k][1]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="f">Etapa</label>
              <select value={f.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
                {(Object.keys(STAGES) as Stage[]).map((k) => (
                  <option key={k} value={k}>
                    {STAGES[k].icon} {STAGES[k].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="f">Prioridad</label>
              <select value={f.priority} onChange={(e) => set('priority', Number(e.target.value))}>
                <option value={3}>🔥 Soñada</option>
                <option value={2}>Buena</option>
                <option value={1}>Plan B</option>
              </select>
            </div>
          </div>
          <label className="f">Link del anuncio</label>
          <input value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
          <div className="row">
            <div>
              <label className="f">Ubicación</label>
              <input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Ej: Linköping" />
            </div>
            <div style={{ flex: '0 0 150px' }}>
              <label className="f">Modalidad</label>
              <select value={f.workMode} onChange={(e) => set('workMode', e.target.value as WorkMode)}>
                <option value="">—</option>
                <option value="onsite">Presencial</option>
                <option value="hybrid">Híbrido</option>
                <option value="remote">Remoto</option>
              </select>
            </div>
            <div>
              <label className="f">¿Cómo la encontré?</label>
              <input value={f.source} onChange={(e) => set('source', e.target.value)} placeholder="LinkedIn, talent day, referido…" list="ab-sources" />
              <datalist id="ab-sources">
                {['LinkedIn', 'Página de la empresa', 'Talent day / feria', 'Referido', 'Recruiter me escribió', 'Universidad', 'Arbetsförmedlingen'].map((x) => (
                  <option key={x} value={x} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="row">
            <div>
              <label className="f">Deadline para postular</label>
              <input type="date" value={f.deadline} onChange={(e) => set('deadline', e.target.value)} />
            </div>
            <div>
              <label className="f">Siguiente paso</label>
              <input value={f.nextAction} onChange={(e) => set('nextAction', e.target.value)} placeholder="Ej: adaptar el CV, escribir al recruiter…" />
            </div>
            <div style={{ flex: '0 0 170px' }}>
              <label className="f">¿Cuándo?</label>
              <input type="date" value={f.nextDate} onChange={(e) => set('nextDate', e.target.value)} />
            </div>
          </div>
          <div className="toolbar" style={{ margin: '6px 0 0' }}>
            {[
              ['+3 d', 3],
              ['+1 sem', 7],
              ['+2 sem', 14],
            ].map(([l, n]) => (
              <button key={l} className="btn sm ghost" onClick={() => set('nextDate', addDays(n as number))}>
                {l}
              </button>
            ))}
            {f.nextDate && (
              <button
                className="btn sm ghost"
                title="Añadir recordatorio a mi calendario"
                onClick={() => downloadText(`recordatorio-${safeName(f.company)}.ics`, icsAllDay(`${f.nextAction || 'Siguiente paso'}: ${appLabel(f)}`, f.nextDate, '', f.url), 'text/calendar')}
              >
                📅 Al calendario
              </button>
            )}
          </div>
          <div className="toolbar" style={{ margin: '12px 0 0', gap: 18 }}>
            <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={f.requiresPermit} onChange={(e) => set('requiresPermit', e.target.checked)} /> 🛂 Pide permiso de trabajo existente
            </label>
            <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={f.requiresSwedish} onChange={(e) => set('requiresSwedish', e.target.checked)} /> 🇸🇪 Pide sueco
            </label>
          </div>
          <label className="f">Notas</label>
          <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 70 }} placeholder="Sueldo, beneficios, impresiones, qué preguntar…" />
        </>
      )}

      {t === 'descripcion' && (
        <>
          <p className="meta">Pega el anuncio completo apenas lo encuentres: los anuncios desaparecen, y lo vas a necesitar para preparar la entrevista.</p>
          <textarea value={f.jd} onChange={(e) => set('jd', e.target.value)} style={{ minHeight: 360 }} placeholder="Pega aquí la descripción del puesto / de la tesis…" />
          <div className="meta">{f.jd.trim().split(/\s+/).filter(Boolean).length} palabras</div>
        </>
      )}

      {t === 'enviado' && (
        <>
          <p className="meta">Lo que la empresa vio de ti. Cuando te llamen, sabrás exactamente qué CV y qué carta tienen.</p>
          <label className="f">Versión del CV</label>
          <input value={f.cvVersion} onChange={(e) => set('cvVersion', e.target.value)} placeholder="Ej: CV_Adri_iOS_v3.pdf" />
          <div className="row" style={{ marginTop: 14 }}>
            <label className="f" style={{ margin: 0 }}>
              Cover letter / carta de motivación enviada
            </label>
            <span style={{ flex: '0 0 auto', display: 'flex', gap: 6 }}>
              {st.snippets.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const sn = st.snippets.find((x) => x.id === e.target.value)
                    if (sn) set('coverLetter', f.coverLetter ? f.coverLetter + '\n\n' + sn.text : sn.text)
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value="">+ Insertar de “Mi pitch”…</option>
                  {st.snippets.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              )}
              {f.coverLetter && <CopyButton text={f.coverLetter} className="btn sm" />}
            </span>
          </div>
          <textarea value={f.coverLetter} onChange={(e) => set('coverLetter', e.target.value)} style={{ minHeight: 280, marginTop: 6 }} placeholder="Pega aquí la carta exacta que enviaste…" />
        </>
      )}

      {t === 'historial' && (
        <>
          <div className="list" style={{ gap: 6 }}>
            {f.events.length ? (
              f.events
                .slice()
                .sort((a, b) => a.t - b.t)
                .map((e) => (
                  <div key={e.id} className="event-row">
                    <span className="meta" style={{ flex: '0 0 70px' }}>
                      {fmtDate(e.t)}
                    </span>
                    <span style={{ flex: 1 }}>
                      {EVENT_TYPES[e.type].split(' ')[0]} {e.type === 'interview' && e.at && <b>{fmtDateTime(e.at)} </b>}
                      {e.text}
                    </span>
                    {e.type === 'interview' && e.at && (
                      <button className="btn sm ghost" onClick={() => ics(e)} title="Añadir a mi calendario">
                        📅
                      </button>
                    )}
                    {e.type !== 'stage' && (
                      <button className="btn sm ghost" title="Borrar" onClick={() => set('events', f.events.filter((x) => x.id !== e.id))}>
                        ×
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <div className="meta">Sin historial todavía.</div>
            )}
          </div>
          <div className="card" style={{ marginTop: 14, boxShadow: 'none' }}>
            <b>Agregar al historial</b>
            <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <select value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value as EventType })} style={{ flex: '0 0 190px' }}>
                {(['note', 'email', 'interview', 'followup'] as EventType[]).map((k) => (
                  <option key={k} value={k}>
                    {EVENT_TYPES[k]}
                  </option>
                ))}
              </select>
              {ev.type === 'interview' && <input type="datetime-local" value={ev.at} onChange={(e) => setEv({ ...ev, at: e.target.value })} style={{ flex: '0 0 220px' }} />}
              <input
                value={ev.text}
                onChange={(e) => setEv({ ...ev, text: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                placeholder={ev.type === 'interview' ? 'Con quién / tipo (técnica, HR…) / link' : 'Qué pasó'}
                style={{ flex: '1 1 220px' }}
              />
              <button className="btn sm primary" style={{ flex: '0 0 auto' }} onClick={addEvent}>
                Agregar
              </button>
            </div>
          </div>
        </>
      )}

      {t === 'contactos' && (
        <>
          <p className="meta">¿Quién es tu contacto en esta empresa? Así sabes a quién escribirle para el follow-up.</p>
          <div className="pick-list">
            {st.contacts.length ? (
              st.contacts.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={f.contactIds.includes(c.id)}
                    onChange={(e) => set('contactIds', e.target.checked ? [...f.contactIds, c.id] : f.contactIds.filter((x) => x !== c.id))}
                  />
                  <span>
                    <b>{c.name}</b> <span className="meta">{[c.title, c.company].filter(Boolean).join(' · ')}</span>
                  </span>
                </label>
              ))
            ) : (
              <div className="meta" style={{ padding: 10 }}>
                Aún no tienes contactos.
              </div>
            )}
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Nombre" style={{ flex: '1 1 180px' }} />
            <input value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} placeholder="Cargo (ej: Recruiter)" style={{ flex: '1 1 180px' }} />
            <button
              className="btn sm"
              style={{ flex: '0 0 auto' }}
              onClick={() => {
                if (!newContact.name.trim()) return
                const cid = uid()
                update((d) => {
                  d.contacts.push({ id: cid, name: newContact.name.trim(), title: newContact.title.trim(), company: f.company.trim(), email: '', linkedin: '', notes: '', created: Date.now() })
                  return `Nuevo contacto: ${newContact.name.trim()}`
                })
                set('contactIds', [...f.contactIds, cid])
                setNewContact({ name: '', title: '' })
              }}
            >
              + Crear y vincular
            </button>
          </div>
        </>
      )}

      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.apps = d.apps.filter((a) => a.id !== existing.id)
                return `Eliminaste ${appLabel(existing)}`
              })
              close()
            }}
          >
            Eliminar
          </ConfirmButton>
        )}
        <span className="sp" />
        <button className="btn ghost" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" onClick={save}>
          Guardar
        </button>
      </div>
    </Modal>
  )
}
