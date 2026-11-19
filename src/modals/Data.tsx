import { useState } from 'react'
import { ConfirmButton, Modal } from '../components/common'
import { isStandalone, promptInstall, useCanInstall } from '../lib/pwa'
import { getState, replaceState } from '../lib/store'
import { connectNewFile, disconnectFile, fsSupported, openExistingFile, useSync } from '../lib/storage'
import { blank, downloadText, normalize } from '../lib/utils'
import type { State } from '../types'
import { useUI } from '../ui'

function InstallSection() {
  const canInstall = useCanInstall()
  if (isStandalone())
    return (
      <div className="settings-sec">
        <label className="f">📲 App instalada</label>
        <p className="meta" style={{ marginTop: 0 }}>
          Estás usando Apply Brain como app, en su propia ventana. Funciona sin internet y se actualiza sola (te avisa antes).
        </p>
      </div>
    )
  return (
    <div className="settings-sec">
      <label className="f">📲 Instalar como app</label>
      <p className="meta" style={{ marginTop: 0 }}>
        Ábrela en su propia ventana, con ícono en el Dock o la barra de tareas, fuera de tus tabs. Funciona sin internet.
      </p>
      {canInstall ? (
        <button className="btn sm primary" onClick={() => void promptInstall()}>
          Instalar Apply Brain
        </button>
      ) : (
        <ul className="meta" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <b>Chrome / Edge:</b> ícono de instalar (⊕) a la derecha de la barra de direcciones, o menú ⋮ → “Instalar Apply Brain”.
          </li>
          <li>
            <b>Safari (Mac):</b> Archivo → Añadir al Dock.
          </li>
          <li>
            <b>iPhone / iPad:</b> Compartir → Añadir a pantalla de inicio.
          </li>
        </ul>
      )}
    </div>
  )
}

export function DataModal() {
  const { close } = useUI()
  const sync = useSync()
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState<State | null>(null)

  const run = async (fn: () => Promise<void>) => {
    setMsg('')
    try {
      await fn()
    } catch (e) {
      const err = e as Error
      if (err.name !== 'AbortError') setMsg('⚠️ ' + err.message)
    }
  }

  const onImportFile = async (file?: File) => {
    if (!file) return
    try {
      const obj = JSON.parse(await file.text())
      if (!obj || !obj.v || !Array.isArray(obj.apps)) throw new Error()
      setPending(normalize(obj))
      setMsg('')
    } catch {
      setMsg('⚠️ Ese archivo no es un respaldo válido de Apply Brain.')
    }
  }

  return (
    <Modal>
      <h2>⚙️ Datos y ajustes</h2>
      <p className="meta">
        Todo vive en <b>tu</b> navegador (IndexedDB): no hay servidor ni cuentas. Para no depender de un solo navegador, conecta un archivo o exporta respaldos.
      </p>

      <InstallSection />

      <div className="settings-sec">
        <label className="f">📁 Sincronizar con un archivo</label>
        {fsSupported ? (
          <>
            <p className="meta" style={{ marginTop: 0 }}>
              {sync.kind === 'file' ? (
                <>
                  Guardando automáticamente en <b>{sync.fileName}</b>.
                </>
              ) : (
                'Guarda cada cambio en un .json de tu disco. Si lo pones en iCloud Drive, Dropbox, OneDrive o un repo de git, lo abres desde otra compu con “Abrir archivo existente”.'
              )}
            </p>
            <div className="toolbar">
              <button className="btn sm primary" onClick={() => run(() => connectNewFile(getState()))}>
                Crear archivo nuevo
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  run(async () => {
                    const data = await openExistingFile()
                    replaceState(data)
                    setMsg('✓ Archivo abierto y conectado.')
                  })
                }
              >
                Abrir archivo existente
              </button>
              {sync.kind !== 'local' && sync.kind !== 'error' && (
                <button className="btn sm ghost" onClick={() => run(disconnectFile)}>
                  Desconectar
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="meta" style={{ marginTop: 0 }}>
            Tu navegador no soporta guardar directo en un archivo (funciona en Chrome y Edge). Usa exportar / importar.
          </p>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">💾 Respaldo manual</label>
        <div className="toolbar">
          <button className="btn sm" onClick={() => downloadText(`apply-brain-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(getState(), null, 1), 'application/json')}>
            Descargar respaldo (.json)
          </button>
          <label className="btn sm">
            Importar respaldo…
            <input type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => onImportFile(e.target.files?.[0])} />
          </label>
        </div>
        {pending && (
          <div className="banner" style={{ margin: '4px 0 0' }}>
            <span>
              Respaldo con {pending.apps.length} postulaciones y {pending.contacts.length} contactos. Reemplazará lo que tienes ahora.
            </span>
            <ConfirmButton
              className="btn sm primary"
              onConfirm={() => {
                replaceState({ ...pending, updated: Date.now() })
                setPending(null)
                setMsg('✓ Respaldo importado.')
              }}
            >
              Reemplazar todo
            </ConfirmButton>
          </div>
        )}
      </div>

      <div className="settings-sec">
        <label className="f">🧨 Empezar de cero</label>
        <ConfirmButton
          className="btn sm ghost danger"
          onConfirm={() => {
            replaceState({ ...blank(), updated: Date.now() })
            close()
          }}
        >
          Borrar todos los datos de este navegador
        </ConfirmButton>
      </div>

      {msg && <p className="meta">{msg}</p>}
      <div className="mfoot">
        <button className="btn primary" onClick={close}>
          Listo
        </button>
      </div>
    </Modal>
  )
}
