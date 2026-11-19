import { useState } from 'react'
import { AppCard } from '../components/Cards'
import { Empty, Head, Seg, usePersisted } from '../components/common'
import { update, useAppState } from '../lib/store'
import { ACTIVE_STAGES, CLOSED_STAGES, KINDS, setStage, STAGES } from '../lib/utils'
import type { Kind, Stage } from '../types'
import { useUI } from '../ui'

type KindFilter = 'all' | Kind

export function Tablero() {
  const s = useAppState()
  const { open } = useUI()
  const [kind, setKind] = usePersisted<KindFilter>('board-kind', 'all')
  const [showClosed, setShowClosed] = usePersisted('board-closed', false)
  const [over, setOver] = useState<Stage | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const apps = s.apps.filter((a) => kind === 'all' || a.kind === kind)
  const stages = showClosed ? [...ACTIVE_STAGES, ...CLOSED_STAGES] : ACTIVE_STAGES

  const drop = (stage: Stage, id: string) => {
    setOver(null)
    setDragging(null)
    update((d) => {
      const a = d.apps.find((x) => x.id === id)
      return a ? setStage(a, stage) : null
    })
  }

  return (
    <>
      <Head title="Tablero" sub="Arrastra cada tarjeta a la etapa en la que está. Al pasar a “Postulé” se agenda el follow-up solo." />
      <div className="toolbar">
        <Seg<KindFilter>
          options={[['all', 'Todas'], ...(Object.keys(KINDS) as Kind[]).map((k) => [k, `${KINDS[k][0]} ${KINDS[k][1]}`] as [Kind, string])]}
          value={kind}
          onChange={setKind}
        />
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> mostrar cerradas
        </label>
      </div>
      {!s.apps.length ? (
        <Empty icon="🗂️">
          <b>Tu tablero está vacío.</b> Agrega una postulación con <b>✚ Postulación</b> o la tecla <span className="kbd">N</span>.
        </Empty>
      ) : (
        <div className="board">
          {stages.map((stage) => {
            const list = apps.filter((a) => a.stage === stage).sort((a, b) => b.priority - a.priority || b.stageAt - a.stageAt)
            return (
              <div
                key={stage}
                className={'col' + (over === stage ? ' over' : '') + (STAGES[stage].active ? '' : ' closed')}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (over !== stage) setOver(stage)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/plain') || dragging
                  if (id) drop(stage, id)
                }}
              >
                <div className="col-h">
                  <span className="dot" style={{ background: STAGES[stage].color }} />
                  {STAGES[stage].icon} {STAGES[stage].label}
                  <span className="count" style={{ marginLeft: 'auto' }}>
                    {list.length}
                  </span>
                </div>
                {list.map((a) => (
                  <AppCard
                    key={a.id}
                    a={a}
                    draggable
                    onDragStart={() => setDragging(a.id)}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    onOpen={() => open({ kind: 'app', id: a.id })}
                  />
                ))}
                {STAGES[stage].active && (
                  <button className="btn sm ghost add-in-col" onClick={() => open({ kind: 'app', stage })}>
                    + Agregar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
