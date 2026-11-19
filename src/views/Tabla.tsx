import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Flags } from '../components/Cards'
import { Empty, Head, usePersisted } from '../components/common'
import { connectXlsx, disconnectXlsx, downloadXlsx, reconnectXlsx, useXlsxStatus, writeXlsx, xlsxSyncSupported } from '../lib/excel'
import { getState, update, useAppState } from '../lib/store'
import {
  daysSince,
  downloadText,
  fmtDate,
  fmtTime,
  isoDate,
  KINDS,
  overviewSort,
  PRIORITY_LABEL,
  relDay,
  setStage,
  STAGE_ORDER,
  STAGES,
  toCSV,
} from '../lib/utils'
import type { Application, Kind, Stage } from '../types'
import { useUI } from '../ui'

type SortKey = 'overview' | 'company' | 'stage' | 'applied' | 'next' | 'deadline' | 'days'
type ColKey = 'priority' | 'company' | 'kind' | 'stage' | 'days' | 'applied' | 'next' | 'deadline' | 'location' | 'source' | 'cv' | 'contacts' | 'flags' | 'link'

const SORTERS: Record<SortKey, (a: Application, b: Application) => number> = {
  overview: overviewSort,
  company: (a, b) => a.company.localeCompare(b.company),
  stage: (a, b) => STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage) || overviewSort(a, b),
  applied: (a, b) => (b.appliedAt || 0) - (a.appliedAt || 0),
  next: (a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'),
  deadline: (a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'),
  days: (a, b) => a.stageAt - b.stageAt,
}

const COLS: { key: ColKey; label: string; sort?: SortKey; always?: boolean; def: boolean }[] = [
  { key: 'priority', label: 'Prioridad', sort: 'overview', def: true },
  { key: 'company', label: 'Empresa · puesto', sort: 'company', always: true, def: true },
  { key: 'kind', label: 'Tipo', def: true },
  { key: 'stage', label: 'Etapa', sort: 'stage', def: true },
  { key: 'days', label: 'Días', sort: 'days', def: true },
  { key: 'applied', label: 'Postulé', sort: 'applied', def: true },
  { key: 'next', label: 'Siguiente paso', sort: 'next', def: true },
  { key: 'deadline', label: 'Deadline', sort: 'deadline', def: true },
  { key: 'location', label: 'Ubicación', def: true },
  { key: 'source', label: 'Fuente', def: false },
  { key: 'cv', label: 'CV enviado', def: false },
  { key: 'contacts', label: 'Contactos', def: false },
  { key: 'flags', label: 'Flags', def: true },
  { key: 'link', label: 'Link', def: true },
]

const stop = (e: React.SyntheticEvent) => e.stopPropagation()
const patch = (id: string, fn: (a: Application) => string | null | void) =>
  update((d) => {
    const a = d.apps.find((x) => x.id === id)
    return a ? fn(a) : null
  })

/** Text cell that commits on blur / Enter, so typing doesn't spam the history. */
function InlineText({ value, placeholder, onCommit }: { value: string; placeholder: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input
      className="cell-input"
      value={v}
      placeholder={placeholder}
      onClick={stop}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        if (e.key === 'Escape') setV(value)
      }}
    />
  )
}

function ExcelBar() {
  const st = useXlsxStatus()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const run = async (fn: () => Promise<void>) => {
    setMsg('')
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="excel-bar">
      <span style={{ fontWeight: 600 }}>📊 Excel</span>
      <button className="btn sm" disabled={busy} onClick={() => run(() => downloadXlsx(getState()))}>
        {busy && st.kind === 'off' ? 'Generando…' : 'Descargar .xlsx'}
      </button>
      {xlsxSyncSupported &&
        (st.kind === 'off' ? (
          <button className="btn sm primary" disabled={busy} onClick={() => run(() => connectXlsx(getState()))} title="Elige dónde guardar un .xlsx que se actualiza solo con cada cambio">
            🔗 Conectar Excel que se actualiza solo
          </button>
        ) : (
          <>
            <span className={'meta' + (st.kind === 'locked' || st.kind === 'error' ? ' overdue' : '')}>
              {st.kind === 'ok' && <>✓ <b>{st.name}</b> {st.at ? `actualizado ${fmtTime(st.at)}` : 'conectado'}</>}
              {st.kind === 'writing' && <>⏳ Actualizando {st.name}…</>}
              {st.kind === 'locked' && <>⚠️ No pude escribir {st.name}. ¿Lo tienes abierto en Excel? Ciérralo y dale a Actualizar.</>}
              {st.kind === 'needs-permission' && <>🔒 El navegador necesita permiso otra vez para {st.name}.</>}
              {st.kind === 'error' && <>⚠️ {st.message}</>}
            </span>
            {st.kind === 'needs-permission' ? (
              <button className="btn sm primary" onClick={() => run(() => reconnectXlsx(getState()))}>
                Dar permiso
              </button>
            ) : (
              <button className="btn sm" disabled={st.kind === 'writing'} onClick={() => run(() => writeXlsx(getState()))}>
                ↻ Actualizar ahora
              </button>
            )}
            <button className="btn sm ghost" onClick={() => run(disconnectXlsx)}>
              Desconectar
            </button>
          </>
        ))}
      {msg && <span className="meta overdue">{msg}</span>}
    </div>
  )
}

export function Tabla() {
  const s = useAppState()
  const { open } = useUI()
  const [q, setQ] = usePersisted('table-q', '')
  const [kind, setKind] = usePersisted<'' | Kind>('table-kind', '')
  const [showClosed, setShowClosed] = usePersisted('table-closed', true)
  const [group, setGroup] = usePersisted('table-group', true)
  const [sort, setSort] = usePersisted<SortKey>('table-sort', 'overview')
  const [cols, setCols] = usePersisted<ColKey[]>('table-cols', COLS.filter((c) => c.def).map((c) => c.key))
  const [colMenu, setColMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const today = isoDate()

  useEffect(() => {
    if (!colMenu) return
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setColMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [colMenu])

  const ql = q.toLowerCase()
  const list = s.apps
    .filter(
      (a) =>
        (!kind || a.kind === kind) &&
        (showClosed || STAGES[a.stage].active) &&
        (!ql || [a.company, a.role, a.location, a.notes, a.source, a.jd, a.cvVersion].join(' ').toLowerCase().includes(ql)),
    )
    .sort(SORTERS[sort])

  const visible = COLS.filter((c) => c.always || cols.includes(c.key))
  const contactNames = (a: Application) => a.contactIds.map((id) => s.contacts.find((c) => c.id === id)?.name).filter(Boolean).join(', ')

  const cell = (a: Application, key: ColKey): ReactNode => {
    switch (key) {
      case 'priority':
        return (
          <select className={'cell-select prio-' + a.priority} value={a.priority} onClick={stop} onChange={(e) => patch(a.id, (x) => void (x.priority = Number(e.target.value)))}>
            {[3, 2, 1].map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        )
      case 'company':
        return (
          <>
            <div className="t">{a.company || 'Sin empresa'}</div>
            <div className="meta">{a.role}</div>
          </>
        )
      case 'kind':
        return <span title={KINDS[a.kind][1]}>{KINDS[a.kind][0]} {KINDS[a.kind][1]}</span>
      case 'stage':
        return (
          <select
            className="cell-select stage"
            style={{ background: STAGES[a.stage].color + '22', color: STAGES[a.stage].color }}
            value={a.stage}
            onClick={stop}
            onChange={(e) => patch(a.id, (x) => setStage(x, e.target.value as Stage))}
          >
            {STAGE_ORDER.map((k) => (
              <option key={k} value={k}>
                {STAGES[k].icon} {STAGES[k].label}
              </option>
            ))}
          </select>
        )
      case 'days': {
        const d = daysSince(a.stageAt)
        return <span className={'meta' + (a.stage === 'applied' && d >= 21 ? ' overdue' : '')}>{d === 0 ? 'hoy' : `${d} d`}</span>
      }
      case 'applied':
        return <span className="meta">{a.appliedAt ? fmtDate(a.appliedAt) : '—'}</span>
      case 'next':
        return STAGES[a.stage].active ? (
          <div className="next-cell" onClick={stop}>
            <InlineText value={a.nextAction} placeholder="+ siguiente paso" onCommit={(v) => patch(a.id, (x) => void (x.nextAction = v))} />
            <input
              type="date"
              className={'cell-input date' + (a.nextDate && a.nextDate < today ? ' overdue' : a.nextDate === today ? ' due-today' : '')}
              value={a.nextDate}
              title={a.nextDate ? relDay(a.nextDate) : 'Sin fecha'}
              onChange={(e) => patch(a.id, (x) => void (x.nextDate = e.target.value))}
            />
          </div>
        ) : (
          <span className="meta">—</span>
        )
      case 'deadline': {
        if (!a.deadline) return <span className="meta">—</span>
        const late = a.deadline < today && (a.stage === 'wishlist' || a.stage === 'preparing')
        return <span className={'meta' + (late ? ' overdue' : '')}>{fmtDate(new Date(a.deadline + 'T00:00:00').getTime())}</span>
      }
      case 'location':
        return (
          <span className="meta">
            {a.location}
            {a.workMode && ` · ${{ onsite: 'presencial', hybrid: 'híbrido', remote: 'remoto' }[a.workMode]}`}
          </span>
        )
      case 'source':
        return <span className="meta">{a.source}</span>
      case 'cv':
        return <span className="meta">{a.cvVersion}</span>
      case 'contacts':
        return <span className="meta">{contactNames(a)}</span>
      case 'flags':
        return <Flags a={a} />
      case 'link':
        return a.url ? (
          <a href={a.url} target="_blank" rel="noopener noreferrer" onClick={stop}>
            Abrir ↗
          </a>
        ) : null
    }
  }

  // Group rows by priority when sorted by the overview order.
  const groups: { label: string | null; rows: Application[] }[] = []
  if (group && sort === 'overview') {
    const active = list.filter((a) => STAGES[a.stage].active)
    for (const p of [3, 2, 1]) {
      const rows = active.filter((a) => a.priority === p)
      if (rows.length) groups.push({ label: `${PRIORITY_LABEL[p]} · ${rows.length}`, rows })
    }
    const closed = list.filter((a) => !STAGES[a.stage].active)
    if (closed.length) groups.push({ label: `Cerradas · ${closed.length}`, rows: closed })
  } else groups.push({ label: null, rows: list })

  return (
    <>
      <Head title="Tabla" sub="El overview de todo: ordenado por prioridad y etapa, con el detalle de cada postulación. Puedes editar prioridad, etapa y siguiente paso aquí mismo." />
      <ExcelBar />
      <div className="toolbar">
        <input type="search" placeholder="Buscar empresa, puesto, notas, descripción…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={kind} onChange={(e) => setKind(e.target.value as '' | Kind)} style={{ maxWidth: 160 }}>
          <option value="">Todos los tipos</option>
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <option key={k} value={k}>
              {KINDS[k][0]} {KINDS[k][1]}
            </option>
          ))}
        </select>
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={group} onChange={(e) => setGroup(e.target.checked)} /> agrupar por prioridad
        </label>
        <label className="meta" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> mostrar cerradas
        </label>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, position: 'relative' }} ref={menuRef}>
          {sort !== 'overview' && (
            <button className="btn sm ghost" onClick={() => setSort('overview')}>
              ↺ Orden por prioridad
            </button>
          )}
          <button className="btn sm" onClick={() => setColMenu(!colMenu)}>
            Columnas ▾
          </button>
          {colMenu && (
            <div className="popover">
              {COLS.filter((c) => !c.always).map((c) => (
                <label key={c.key}>
                  <input type="checkbox" checked={cols.includes(c.key)} onChange={(e) => setCols(e.target.checked ? [...cols, c.key] : cols.filter((x) => x !== c.key))} /> {c.label}
                </label>
              ))}
            </div>
          )}
          <button className="btn sm" onClick={() => open({ kind: 'import' })}>
            📥 CSV
          </button>
          <button className="btn sm" disabled={!s.apps.length} onClick={() => downloadText(`postulaciones-${isoDate()}.csv`, toCSV([...list]), 'text/csv')}>
            📤 CSV
          </button>
        </span>
      </div>

      {!s.apps.length ? (
        <Empty icon="📋">
          Aún no hay postulaciones. Agrega una o <b>importa tu Excel / Google Sheet como CSV</b>.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="tbl overview">
            <thead>
              <tr>
                {visible.map((c) => (
                  <th key={c.key} className={(c.sort && sort === c.sort ? 'sorted ' : '') + (c.sort ? '' : 'nosort')} onClick={() => c.sort && setSort(c.sort)}>
                    {c.label}
                    {c.sort && sort === c.sort && ' ↓'}
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map((g, gi) => (
              <tbody key={gi}>
                {g.label && (
                  <tr className="group-row">
                    <td colSpan={visible.length}>{g.label}</td>
                  </tr>
                )}
                {g.rows.map((a) => (
                  <tr key={a.id} className={STAGES[a.stage].active ? '' : 'closed-row'} onClick={() => open({ kind: 'app', id: a.id })}>
                    {visible.map((c) => (
                      <td key={c.key} className={'c-' + c.key}>
                        {cell(a, c.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
          {!list.length && <p className="meta" style={{ padding: 12 }}>Nada coincide con los filtros.</p>}
        </div>
      )}
    </>
  )
}
