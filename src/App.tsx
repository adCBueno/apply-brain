import { useCallback, useEffect, useMemo, useState } from 'react'
import { Nav } from './components/Nav'
import { PwaBanner } from './components/PwaBanner'
import { ModalHost } from './modals'
import type { View } from './types'
import { UIContext, VIEWS, type ModalSpec, type UI } from './ui'
import { Contactos } from './views/Contactos'
import { Hoy } from './views/Hoy'
import { Pitch } from './views/Pitch'
import { Rastro } from './views/Rastro'
import { Tabla } from './views/Tabla'
import { Tablero } from './views/Tablero'

function initialView(): View {
  const h = location.hash.slice(1) as View
  if (VIEWS.includes(h)) return h
  const saved = localStorage.getItem('ab-view') as View | null
  return saved && VIEWS.includes(saved) ? saved : 'hoy'
}

const isTyping = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')

export default function App() {
  const [view, setView] = useState<View>(initialView)
  const [modal, setModal] = useState<{ spec: ModalSpec; key: number } | null>(null)

  const go = useCallback((v: View) => {
    setView(v)
    localStorage.setItem('ab-view', v)
    if (location.hash.slice(1) !== v) history.replaceState(null, '', '#' + v)
    window.scrollTo(0, 0)
  }, [])

  const ui: UI = useMemo(
    () => ({
      open: (spec) => setModal({ spec, key: Date.now() + Math.random() }),
      close: () => setModal(null),
      go,
    }),
    [go],
  )

  // App shortcut / deep link: ?new=app opens a new application right away.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === 'app') {
      ui.open({ kind: 'app' })
      history.replaceState(null, '', location.pathname + location.hash)
    }
  }, [ui])

  useEffect(() => {
    const onHash = () => {
      const v = location.hash.slice(1) as View
      if (VIEWS.includes(v)) setView(v)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal && e.key === 'Escape') {
        setModal(null)
        return
      }
      if (!modal && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'n' && !isTyping()) {
        e.preventDefault()
        ui.open({ kind: 'app' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, ui])

  return (
    <UIContext.Provider value={ui}>
      <div className="app">
        <Nav view={view} />
        <main className={view === 'tablero' || view === 'lista' ? 'wide' : ''}>
          {view === 'hoy' && <Hoy />}
          {view === 'tablero' && <Tablero />}
          {view === 'lista' && <Tabla />}
          {view === 'contactos' && <Contactos />}
          {view === 'pitch' && <Pitch />}
          {view === 'rastro' && <Rastro />}
        </main>
      </div>
      <button className="btn primary fab" title="Atajo: tecla N" onClick={() => ui.open({ kind: 'app' })}>
        ✚ Postulación
      </button>
      {modal && <ModalHost key={modal.key} spec={modal.spec} />}
      <PwaBanner />
    </UIContext.Provider>
  )
}
