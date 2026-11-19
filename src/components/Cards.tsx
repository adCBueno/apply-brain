import { daysSince, isoDate, KINDS, relDay, STAGES } from '../lib/utils'
import type { Application } from '../types'

/** "⏰ Follow-up · hoy" with overdue highlighting. */
export function NextAction({ a, compact }: { a: Application; compact?: boolean }) {
  if (!a.nextAction && !a.nextDate) return null
  const overdue = !!a.nextDate && a.nextDate < isoDate()
  const today = a.nextDate === isoDate()
  return (
    <div className={'meta' + (overdue ? ' overdue' : today ? ' due-today' : '')} style={{ marginTop: compact ? 4 : 0 }}>
      ⏰ {a.nextAction || 'Siguiente paso'}
      {a.nextDate && ` · ${relDay(a.nextDate)}`}
    </div>
  )
}

export function Flags({ a }: { a: Application }) {
  return (
    <>
      {a.requiresPermit && (
        <span className="flag bad" title="Pide permiso de trabajo existente">
          🛂 permiso
        </span>
      )}
      {a.requiresSwedish && (
        <span className="flag" title="Pide sueco">
          🇸🇪 sueco
        </span>
      )}
    </>
  )
}

export function StageBadge({ a }: { a: Application }) {
  const st = STAGES[a.stage]
  return (
    <span className="badge" style={{ background: st.color + '22', color: st.color }}>
      {st.icon} {st.label}
    </span>
  )
}

export function AppCard({ a, onOpen, draggable, onDragStart, onDragEnd }: { a: Application; onOpen: () => void; draggable?: boolean; onDragStart?: () => void; onDragEnd?: () => void }) {
  const days = daysSince(a.stageAt)
  return (
    <div
      className="kcard"
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', a.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.()
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t">
            {a.priority === 3 && '🔥 '}
            {a.company || 'Sin empresa'}
          </div>
          <div className="meta clamp">{a.role}</div>
        </div>
        <span style={{ flex: '0 0 auto' }} title={KINDS[a.kind][1]}>
          {KINDS[a.kind][0]}
        </span>
      </div>
      <NextAction a={a} compact />
      <div className="kfoot">
        <Flags a={a} />
        <span className="meta" style={{ marginLeft: 'auto' }} title="Días en esta etapa">
          {days === 0 ? 'hoy' : `${days} d`}
        </span>
      </div>
    </div>
  )
}
