import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getState, replaceState } from '../lib/store'
import { reconnectFile, useSync } from '../lib/storage'
import { useUI } from '../ui'

export function Head({ title, sub }: { title: ReactNode; sub: ReactNode }) {
  const sync = useSync()
  const { open } = useUI()
  const label =
    sync.kind === 'local'
      ? '💾 Guardado en este navegador'
      : sync.kind === 'file'
        ? `📁 Sincronizado con ${sync.fileName}`
        : sync.kind === 'needs-permission'
          ? `⚠️ Reconecta ${sync.fileName}`
          : `⚠️ ${sync.message}`
  const reconnect = async () => {
    const newer = await reconnectFile(getState())
    if (newer) replaceState(newer)
  }
  return (
    <>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>{title}</h1>
          <p className="sub">{sub}</p>
        </div>
        <button className="sync btn ghost sm" style={{ flex: '0 0 auto' }} onClick={() => open({ kind: 'data' })} title="Datos y ajustes">
          {label}
        </button>
      </div>
      {sync.kind === 'needs-permission' && (
        <div className="banner">
          <span>
            📁 El navegador necesita tu permiso otra vez para seguir guardando en <b>{sync.fileName}</b>. Mientras tanto, todo se guarda en el navegador.
          </span>
          <button className="btn sm primary" onClick={reconnect}>
            Reconectar
          </button>
        </div>
      )}
    </>
  )
}

export function Modal({ wide, children }: { wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const b = ref.current?.querySelector<HTMLButtonElement>('.mfoot .btn.primary')
        if (b) {
          e.preventDefault()
          b.click()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="ov show">
      <div ref={ref} className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

export function Seg<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} type="button" className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

/** Two-click destructive button: "Eliminar" -> "¿Seguro?" -> action. */
export function ConfirmButton({ onConfirm, children, className = 'btn ghost danger' }: { onConfirm: () => void; children: ReactNode; className?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? '¿Seguro? Clic otra vez' : children}
    </button>
  )
}

export function CopyButton({ text, label = 'Copiar', className = 'btn primary' }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setState('ok')
        } catch {
          setState('fail')
        }
        setTimeout(() => setState('idle'), 2000)
      }}
    >
      {state === 'ok' ? '¡Copiado! ✓' : state === 'fail' ? 'No se pudo copiar' : label}
    </button>
  )
}

export function Empty({ icon, children }: { icon: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontSize: 34 }}>{icon}</div>
      {children}
    </div>
  )
}

/** useState persisted in localStorage (for filters and small UI prefs). */
export function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('ab-' + key)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  const set = (nv: T) => {
    setV(nv)
    try {
      localStorage.setItem('ab-' + key, JSON.stringify(nv))
    } catch {
      /* ignore */
    }
  }
  return [v, set]
}

