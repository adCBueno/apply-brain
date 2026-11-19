import { createContext, useContext } from 'react'
import type { Stage, View } from './types'

export type ModalSpec =
  | { kind: 'app'; id?: string; stage?: Stage; tab?: AppTab }
  | { kind: 'contact'; id?: string }
  | { kind: 'snippet'; id?: string }
  | { kind: 'import' }
  | { kind: 'data' }

export type AppTab = 'detalles' | 'descripcion' | 'enviado' | 'historial' | 'contactos'

export interface UI {
  open: (m: ModalSpec) => void
  close: () => void
  go: (v: View) => void
}

export const UIContext = createContext<UI | null>(null)

export function useUI(): UI {
  const ui = useContext(UIContext)
  if (!ui) throw new Error('useUI outside provider')
  return ui
}

export const VIEWS: View[] = ['hoy', 'tablero', 'lista', 'contactos', 'pitch', 'rastro']
