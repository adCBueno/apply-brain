import { Empty, Head, usePersisted } from '../components/common'
import { useAppState } from '../lib/store'
import { appLabel } from '../lib/utils'
import { useUI } from '../ui'

export function Contactos() {
  const s = useAppState()
  const { open } = useUI()
  const [q, setQ] = usePersisted('contacts-q', '')
  const ql = q.toLowerCase()
  const list = s.contacts
    .filter((c) => !ql || [c.name, c.title, c.company, c.notes, c.email].join(' ').toLowerCase().includes(ql))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <Head title="Contactos" sub="Recruiters, gente que conociste en ferias, referidos. Buscar trabajo también es de relaciones." />
      <div className="toolbar">
        <button className="btn primary" onClick={() => open({ kind: 'contact' })}>
          + Contacto
        </button>
        <input type="search" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!s.contacts.length ? (
        <Empty icon="👥">
          <b>¿Conociste a alguien en un talent day o te escribió un recruiter?</b> Guárdalo aquí con dónde lo conociste.
          <br />
          Luego lo vinculas a la postulación y sabes a quién escribirle para el follow-up.
        </Empty>
      ) : (
        <div className="grid g2">
          {list.map((c) => {
            const apps = s.apps.filter((a) => a.contactIds.includes(c.id))
            return (
              <div key={c.id} className="item" onClick={() => open({ kind: 'contact', id: c.id })}>
                <div className="t">{c.name}</div>
                <div className="meta">{[c.title, c.company].filter(Boolean).join(' · ')}</div>
                {c.notes && <div className="meta" style={{ marginTop: 4 }}>📝 {c.notes}</div>}
                {apps.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {apps.map((a) => (
                      <span key={a.id} className="chip">
                        {appLabel(a)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
