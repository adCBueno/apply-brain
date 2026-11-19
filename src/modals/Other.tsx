import { useState } from 'react'
import { ConfirmButton, CopyButton, Modal } from '../components/common'
import { update, useAppState } from '../lib/store'
import { appLabel, appsFromCSV, parseCSV, sameCompany, STAGES, uid } from '../lib/utils'
import type { Application, Contact } from '../types'
import { useUI } from '../ui'

export function ContactModal({ id }: { id?: string }) {
  const st = useAppState()
  const { close, open } = useUI()
  const existing = id ? st.contacts.find((c) => c.id === id) : undefined
  const [f, setF] = useState<Contact>(() => existing ?? { id: uid(), name: '', title: '', company: '', email: '', linkedin: '', notes: '', created: Date.now() })
  const [err, setErr] = useState(false)
  const set = <K extends keyof Contact>(k: K, v: Contact[K]) => setF((p) => ({ ...p, [k]: v }))
  if (id && !existing) return null
  const apps = st.apps.filter((a) => a.contactIds.includes(f.id))

  const save = () => {
    if (!f.name.trim()) {
      setErr(true)
      return
    }
    update((d) => {
      const i = d.contacts.findIndex((c) => c.id === f.id)
      const c = { ...f, name: f.name.trim() }
      if (i >= 0) d.contacts[i] = c
      else d.contacts.push(c)
      return i >= 0 ? `Editaste a ${c.name}` : `Nuevo contacto: ${c.name}`
    })
    close()
  }

  return (
    <Modal>
      <h2>{existing ? existing.name : 'Nuevo contacto'}</h2>
      <div className="row">
        <div>
          <label className="f">Nombre</label>
          <input autoFocus value={f.name} onChange={(e) => set('name', e.target.value)} style={err ? { borderColor: '#c0392b' } : undefined} />
        </div>
        <div>
          <label className="f">Cargo</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Recruiter, Engineering Manager…" />
        </div>
      </div>
      <div className="row">
        <div>
          <label className="f">Empresa</label>
          <input value={f.company} onChange={(e) => set('company', e.target.value)} />
        </div>
        <div>
          <label className="f">Email</label>
          <input value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
      </div>
      <label className="f">LinkedIn</label>
      <div className="row">
        <input value={f.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/…" />
        {f.linkedin && (
          <a className="btn sm" style={{ flex: '0 0 auto' }} href={f.linkedin} target="_blank" rel="noopener noreferrer">
            Abrir ↗
          </a>
        )}
      </div>
      <label className="f">Dónde la/lo conocí y de qué hablamos</label>
      <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 80 }} placeholder="Ej: talent day BTH, hablamos de la tesis de IA…" />
      {apps.length > 0 && (
        <>
          <label className="f">Postulaciones vinculadas</label>
          {apps.map((a) => (
            <span key={a.id} className="chip pick" onClick={() => open({ kind: 'app', id: a.id, tab: 'contactos' })}>
              {appLabel(a)}
            </span>
          ))}
        </>
      )}
      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.contacts = d.contacts.filter((c) => c.id !== existing.id)
                d.apps.forEach((a) => (a.contactIds = a.contactIds.filter((x) => x !== existing.id)))
                return `Eliminaste a ${existing.name}`
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

export function SnippetModal({ id }: { id?: string }) {
  const st = useAppState()
  const { close } = useUI()
  const existing = id ? st.snippets.find((x) => x.id === id) : undefined
  const [title, setTitle] = useState(existing?.title ?? '')
  const [text, setText] = useState(existing?.text ?? '')
  if (id && !existing) return null
  const save = () => {
    if (!title.trim()) return
    update((d) => {
      const x = d.snippets.find((y) => y.id === id)
      if (x) {
        x.title = title.trim()
        x.text = text
        return `Editaste “${x.title}”`
      }
      d.snippets.push({ id: uid(), title: title.trim(), text, created: Date.now() })
      return `Nuevo texto: “${title.trim()}”`
    })
    close()
  }
  return (
    <Modal wide>
      <h2>{existing ? 'Editar texto' : 'Nuevo texto'}</h2>
      <label className="f">Título</label>
      <input autoFocus={!existing} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Por qué quiero esta tesis" />
      <label className="f">Texto</label>
      <textarea autoFocus={!!existing} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 260 }} placeholder="Escríbelo una vez, bien. Usa números concretos cuando puedas." />
      <div className="meta">{text.trim().split(/\s+/).filter(Boolean).length} palabras · {text.length} caracteres</div>
      <div className="mfoot">
        {existing && (
          <ConfirmButton
            onConfirm={() => {
              update((d) => {
                d.snippets = d.snippets.filter((x) => x.id !== existing.id)
                return `Eliminaste “${existing.title}”`
              })
              close()
            }}
          >
            Eliminar
          </ConfirmButton>
        )}
        <span className="sp" />
        {text && <CopyButton text={text} className="btn" />}
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

export function ImportModal() {
  const st = useAppState()
  const { close, go } = useUI()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<{ apps: Application[]; matched: string[]; dupes: number } | null>(null)
  const [err, setErr] = useState('')

  const analyze = (csv: string) => {
    setErr('')
    const { apps, matched } = appsFromCSV(parseCSV(csv))
    if (!apps.length) {
      setPreview(null)
      setErr('No encontré postulaciones. ¿La primera fila tiene los nombres de las columnas (Company, Role, Status…)?')
      return
    }
    const dupes = apps.filter((a) => sameCompany(st, a.company).some((b) => b.role.toLowerCase() === a.role.toLowerCase())).length
    setPreview({ apps, matched, dupes })
  }

  const doImport = () => {
    if (!preview) return
    let added = 0
    update((d) => {
      for (const a of preview.apps) {
        const dup = d.apps.some((b) => b.company.toLowerCase() === a.company.toLowerCase() && b.role.toLowerCase() === a.role.toLowerCase())
        if (!dup) {
          d.apps.push(a)
          added++
        }
      }
      return `Importaste ${added} postulaciones desde CSV 📥`
    })
    close()
    go('tablero')
  }

  const FIELD_NAMES: Record<string, string> = {
    company: 'empresa',
    role: 'puesto',
    url: 'link',
    stage: 'estado',
    applied: 'fecha',
    location: 'ubicación',
    notes: 'notas',
    deadline: 'deadline',
    kind: 'tipo',
    source: 'fuente',
    cv: 'CV',
  }

  return (
    <Modal wide>
      <h2>📥 Importar desde Excel / Google Sheets</h2>
      <p className="meta">
        Exporta tu tabla como <b>CSV</b> (Excel: Guardar como → CSV · Google Sheets: Archivo → Descargar → CSV) y súbela, o copia las celdas y pégalas aquí. La primera fila tiene que tener los
        nombres de columna; reconozco nombres comunes en español e inglés (Company / Empresa, Role / Puesto, Status / Estado, Date applied / Fecha, Link…). Lo que no reconozca va a Notas.
      </p>
      <div className="toolbar">
        <label className="btn sm">
          Elegir archivo .csv…
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const t = await file.text()
              setText(t)
              analyze(t)
            }}
          />
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setPreview(null)
        }}
        style={{ minHeight: 160, font: '12px ui-monospace,monospace' }}
        placeholder={'Company,Role,Status,Date applied,Link\nEricsson,Thesis: AI-generated dependencies,Applied,2026-10-10,https://…'}
      />
      {!preview && (
        <div className="toolbar" style={{ marginTop: 8 }}>
          <button className="btn sm" disabled={!text.trim()} onClick={() => analyze(text)}>
            Revisar
          </button>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {preview && (
        <div className="card" style={{ marginTop: 10, boxShadow: 'none' }}>
          <b>
            {preview.apps.length} postulaciones encontradas
            {preview.dupes > 0 && ` · ${preview.dupes} ya existen y se saltarán`}
          </b>
          <div className="meta">Columnas reconocidas: {preview.matched.map((m) => FIELD_NAMES[m] || m).join(', ')}</div>
          <div className="pick-list" style={{ marginTop: 8, maxHeight: 220 }}>
            {preview.apps.slice(0, 50).map((a) => (
              <label key={a.id} style={{ cursor: 'default' }}>
                <span>
                  {STAGES[a.stage].icon} <b>{a.company}</b> <span className="meta">{a.role}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mfoot">
        <button className="btn ghost" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" disabled={!preview} onClick={doImport}>
          Importar
        </button>
      </div>
    </Modal>
  )
}
