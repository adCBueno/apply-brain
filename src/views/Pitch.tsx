import { CopyButton, Empty, Head } from '../components/common'
import { update, useAppState } from '../lib/store'
import { uid } from '../lib/utils'
import { useUI } from '../ui'

const STARTERS = [
  { title: 'Elevator pitch (30 s)', text: '' },
  { title: 'Mi proyecto más fuerte', text: '' },
  { title: '¿Por qué esta área / por qué Suecia?', text: '' },
  { title: 'Disponibilidad y permiso de trabajo', text: '' },
]

export function Pitch() {
  const s = useAppState()
  const { open } = useUI()
  return (
    <>
      <Head
        title="Mi pitch"
        sub="Los textos que reescribes en cada postulación: escríbelos bien una vez y cópialos. También los puedes insertar en un cover letter."
      />
      <div className="toolbar">
        <button className="btn primary" onClick={() => open({ kind: 'snippet' })}>
          + Texto
        </button>
      </div>
      {!s.snippets.length ? (
        <Empty icon="💬">
          <b>Tu banco de respuestas.</b> Logros con números, tu historia, respuestas a preguntas típicas de formularios.
          <div style={{ marginTop: 14 }}>
            <button
              className="btn"
              onClick={() =>
                update((d) => {
                  STARTERS.forEach((x) => d.snippets.push({ id: uid(), title: x.title, text: x.text, created: Date.now() }))
                  return 'Creaste plantillas para tu pitch'
                })
              }
            >
              Crear plantillas para empezar
            </button>
          </div>
        </Empty>
      ) : (
        <div className="grid g2">
          {s.snippets.map((x) => (
            <div key={x.id} className="card">
              <div className="row">
                <h2 style={{ margin: 0 }}>{x.title}</h2>
                <span style={{ flex: '0 0 auto', display: 'flex', gap: 4 }}>
                  <button className="btn sm ghost" onClick={() => open({ kind: 'snippet', id: x.id })}>
                    ✎
                  </button>
                  {x.text && <CopyButton text={x.text} className="btn sm" />}
                </span>
              </div>
              <div className={x.text ? 'snippet-text' : 'meta'} style={{ marginTop: 8 }} onClick={() => !x.text && open({ kind: 'snippet', id: x.id })}>
                {x.text || 'Vacío: clic en ✎ para escribirlo.'}
              </div>
              <div className="meta" style={{ marginTop: 8 }}>
                {x.text.trim().split(/\s+/).filter(Boolean).length} palabras
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
