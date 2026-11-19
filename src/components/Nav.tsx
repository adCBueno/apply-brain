import { promptInstall, useCanInstall } from '../lib/pwa'
import { useAppState } from '../lib/store'
import { isoDate, STAGES } from '../lib/utils'
import type { View } from '../types'
import { useUI } from '../ui'

export function Nav({ view }: { view: View }) {
  const s = useAppState()
  const { go, open } = useUI()
  const canInstall = useCanInstall()
  const today = isoDate()
  const due = s.apps.filter((a) => a.nextDate && a.nextDate <= today && STAGES[a.stage].active).length
  const active = s.apps.filter((a) => STAGES[a.stage].active).length
  const items: [View, string, string, string | number][] = [
    ['hoy', '🌤️', 'Hoy', due ? `${due} ⏰` : ''],
    ['tablero', '🗂️', 'Tablero', active || ''],
    ['lista', '📊', 'Tabla', s.apps.length || ''],
    ['contactos', '👥', 'Contactos', s.contacts.length || ''],
    ['pitch', '💬', 'Mi pitch', s.snippets.length || ''],
    ['rastro', '🧭', 'Rastro', ''],
  ]
  return (
    <nav className="side">
      <div className="brand">
        Apply Brain<small>tus postulaciones, sin perderte</small>
      </div>
      {items.map(([k, icon, label, count]) => (
        <button key={k} className={'nav-btn' + (view === k ? ' on' : '')} onClick={() => go(k)}>
          <span>{icon}</span>
          <span>{label}</span>
          {count !== '' && <span className="ct">{count}</span>}
        </button>
      ))}
      <div className="side-foot">
        {canInstall && (
          <button className="btn sm primary" style={{ marginBottom: 8 }} onClick={() => void promptInstall()} title="Abrir en su propia ventana, fuera del navegador">
            📲 Instalar app
          </button>
        )}
        <button className="btn sm ghost" onClick={() => open({ kind: 'data' })}>
          ⚙️ Datos y ajustes
        </button>
      </div>
    </nav>
  )
}
