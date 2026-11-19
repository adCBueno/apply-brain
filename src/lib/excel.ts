import type { Workbook, Worksheet } from 'exceljs'
import { createStore, del, get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import type { State } from '../types'
import { daysSince, isoDate, KINDS, overviewSort, PRIORITY_LABEL, STAGES, stats } from './utils'

/**
 * Excel overview:
 *  - downloadXlsx(): one-off formatted .xlsx
 *  - connectXlsx(): pick a .xlsx file on disk that is rewritten after every change (Chrome/Edge).
 * Excel locks files it has open (on Windows), so a write can fail until the file is closed:
 * we report that as "locked" and retry on the next change, on window focus, or with a button.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const db = createStore('apply-brain', 'kv')
const HANDLE_KEY = 'ab-xlsx-handle'

export type XlsxStatus =
  | { kind: 'off' }
  | { kind: 'ok'; name: string; at: number }
  | { kind: 'writing'; name: string }
  | { kind: 'locked'; name: string }
  | { kind: 'needs-permission'; name: string }
  | { kind: 'error'; name: string; message: string }

let handle: FileSystemFileHandle | null = null
let status: XlsxStatus = { kind: 'off' }
const subs = new Set<() => void>()
function setStatus(s: XlsxStatus) {
  status = s
  subs.forEach((f) => f())
}
export function useXlsxStatus(): XlsxStatus {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => {
        subs.delete(cb)
      }
    },
    () => status,
  )
}

/* ---------- workbook ---------- */

const D = (t?: number | string) => {
  if (t == null || t === '') return null
  const d = typeof t === 'number' ? new Date(t) : new Date(t + 'T00:00:00')
  // Excel stores dates without a zone; shift so the cell shows the local calendar day.
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}
const argb = (hex: string) => 'FF' + hex.replace('#', '').toUpperCase()
const tint = (hex: string) => {
  // light background version of a stage color
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * 0.82)
  const r = mix((n >> 16) & 255),
    g = mix((n >> 8) & 255),
    b = mix(n & 255)
  return 'FF' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function styleHeader(ws: Worksheet, color = '#1f7a6d') {
  const row = ws.getRow(1)
  row.height = 24
  row.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(color) } }
    c.alignment = { vertical: 'middle' }
  })
}

export async function buildWorkbook(st: State): Promise<ArrayBuffer> {
  const mod = await import('exceljs/dist/exceljs.min.js')
  const ExcelJS = mod.default
  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = 'Apply Brain'
  wb.created = new Date()
  const today = isoDate()
  const contactName = (id: string) => st.contacts.find((c) => c.id === id)?.name || ''

  /* Overview */
  const ws = wb.addWorksheet('Overview', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] })
  ws.columns = [
    { header: 'Prioridad', key: 'priority', width: 12 },
    { header: 'Empresa', key: 'company', width: 24 },
    { header: 'Puesto / tesis', key: 'role', width: 34 },
    { header: 'Tipo', key: 'kind', width: 12 },
    { header: 'Etapa', key: 'stage', width: 18 },
    { header: 'Días en etapa', key: 'days', width: 12 },
    { header: 'Postulé', key: 'applied', width: 13 },
    { header: 'Siguiente paso', key: 'next', width: 32 },
    { header: 'Para cuándo', key: 'nextDate', width: 13 },
    { header: 'Deadline', key: 'deadline', width: 13 },
    { header: 'Ubicación', key: 'location', width: 16 },
    { header: 'Modalidad', key: 'mode', width: 12 },
    { header: 'Fuente', key: 'source', width: 18 },
    { header: 'CV enviado', key: 'cv', width: 22 },
    { header: 'Contactos', key: 'contacts', width: 22 },
    { header: 'Permiso de trabajo', key: 'permit', width: 12 },
    { header: 'Sueco', key: 'swedish', width: 9 },
    { header: 'Link', key: 'url', width: 14 },
    { header: 'Notas', key: 'notes', width: 40 },
  ]
  const MODES: Record<string, string> = { onsite: 'Presencial', hybrid: 'Híbrido', remote: 'Remoto', '': '' }
  for (const a of [...st.apps].sort(overviewSort)) {
    const stage = STAGES[a.stage]
    const row = ws.addRow({
      priority: PRIORITY_LABEL[a.priority] || '',
      company: a.company,
      role: a.role,
      kind: `${KINDS[a.kind][0]} ${KINDS[a.kind][1]}`,
      stage: `${stage.icon} ${stage.label}`,
      days: daysSince(a.stageAt),
      applied: D(a.appliedAt),
      next: a.nextAction,
      nextDate: D(a.nextDate),
      deadline: D(a.deadline),
      location: a.location,
      mode: MODES[a.workMode],
      source: a.source,
      cv: a.cvVersion,
      contacts: a.contactIds.map(contactName).filter(Boolean).join(', '),
      permit: a.requiresPermit ? '🛂 Pide' : '',
      swedish: a.requiresSwedish ? 'Sí' : '',
      url: a.url ? { text: 'Abrir', hyperlink: a.url } : '',
      notes: a.notes,
    })
    row.alignment = { vertical: 'top', wrapText: false }
    row.getCell('stage').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tint(stage.color) } }
    row.getCell('stage').font = { color: { argb: argb(stage.color) }, bold: true }
    if (a.priority === 3) row.getCell('priority').font = { bold: true, color: { argb: 'FFB3261E' } }
    if (a.url) row.getCell('url').font = { color: { argb: 'FF1F7A6D' }, underline: true }
    if (a.nextDate && a.nextDate < today && stage.active) row.getCell('nextDate').font = { bold: true, color: { argb: 'FFC0392B' } }
    if (a.deadline && a.deadline < today && (a.stage === 'wishlist' || a.stage === 'preparing')) row.getCell('deadline').font = { bold: true, color: { argb: 'FFC0392B' } }
    if (a.requiresPermit) row.getCell('permit').font = { color: { argb: 'FFB3261E' } }
    if (!stage.active) row.eachCell((c) => (c.font = { ...(c.font || {}), color: { argb: 'FF9A9088' } }))
  }
  ;['applied', 'nextDate', 'deadline'].forEach((k) => (ws.getColumn(k).numFmt = 'dd mmm yyyy'))
  styleHeader(ws)
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } }

  /* Resumen */
  const s = stats(st)
  const rs = wb.addWorksheet('Resumen')
  rs.columns = [
    { header: 'Métrica', key: 'k', width: 30 },
    { header: 'Valor', key: 'v', width: 14 },
  ]
  rs.addRows([
    { k: 'Actualizado', v: new Date() },
    { k: 'Postulaciones enviadas', v: s.applied },
    { k: 'Enviadas esta semana', v: s.thisWeek },
    { k: 'Tasa de respuesta', v: s.responseRate / 100 },
    { k: 'En entrevistas', v: s.interviews },
    { k: 'Ofertas', v: s.offers },
    {},
  ])
  rs.getCell('B2').numFmt = 'dd mmm yyyy hh:mm'
  rs.getCell('B5').numFmt = '0%'
  rs.addRow({ k: 'Por etapa', v: '' }).font = { bold: true }
  for (const [k, meta] of Object.entries(STAGES)) rs.addRow({ k: `${meta.icon} ${meta.label}`, v: st.apps.filter((a) => a.stage === k).length })
  styleHeader(rs)

  /* Historial */
  const hs = wb.addWorksheet('Historial', { views: [{ state: 'frozen', ySplit: 1 }] })
  hs.columns = [
    { header: 'Fecha', key: 't', width: 18 },
    { header: 'Empresa', key: 'company', width: 22 },
    { header: 'Puesto', key: 'role', width: 30 },
    { header: 'Tipo', key: 'type', width: 14 },
    { header: 'Detalle', key: 'text', width: 50 },
    { header: 'Entrevista', key: 'at', width: 18 },
  ]
  const TYPES: Record<string, string> = { note: 'Nota', stage: 'Etapa', email: 'Email', interview: 'Entrevista', followup: 'Follow-up' }
  st.apps
    .flatMap((a) => a.events.map((e) => ({ a, e })))
    .sort((x, y) => y.e.t - x.e.t)
    .forEach(({ a, e }) => hs.addRow({ t: new Date(e.t), company: a.company, role: a.role, type: TYPES[e.type], text: e.text, at: e.at ? new Date(e.at) : null }))
  hs.getColumn('t').numFmt = 'dd mmm yyyy hh:mm'
  hs.getColumn('at').numFmt = 'dd mmm yyyy hh:mm'
  styleHeader(hs)
  hs.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } }

  /* Contactos */
  const cs = wb.addWorksheet('Contactos', { views: [{ state: 'frozen', ySplit: 1 }] })
  cs.columns = [
    { header: 'Nombre', key: 'name', width: 22 },
    { header: 'Cargo', key: 'title', width: 22 },
    { header: 'Empresa', key: 'company', width: 20 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'LinkedIn', key: 'linkedin', width: 30 },
    { header: 'Notas', key: 'notes', width: 40 },
    { header: 'Postulaciones', key: 'apps', width: 34 },
  ]
  st.contacts.forEach((c) =>
    cs.addRow({
      ...c,
      apps: st.apps
        .filter((a) => a.contactIds.includes(c.id))
        .map((a) => `${a.company} · ${a.role}`)
        .join(', '),
    }),
  )
  styleHeader(cs)

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

/* ---------- one-off download ---------- */
export async function downloadXlsx(st: State) {
  const buf = await buildWorkbook(st)
  const url = URL.createObjectURL(new Blob([buf], { type: XLSX_MIME }))
  const a = document.createElement('a')
  a.href = url
  a.download = `postulaciones-${isoDate()}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------- auto-updating file ---------- */
export const xlsxSyncSupported = typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'

export async function initXlsx() {
  try {
    handle = (await get<FileSystemFileHandle>(HANDLE_KEY, db)) ?? null
  } catch {
    handle = null
  }
  if (!handle) return
  const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt'
  setStatus(perm === 'granted' ? { kind: 'ok', name: handle.name, at: 0 } : { kind: 'needs-permission', name: handle.name })
}

let timer: number | undefined
let latest: State | null = null

export function scheduleXlsx(st: State) {
  latest = st
  if (!handle || status.kind === 'needs-permission') return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => void writeXlsx(), 1500)
}

export async function writeXlsx(st?: State) {
  const data = st ?? latest
  if (!handle || !data) return
  const name = handle.name
  setStatus({ kind: 'writing', name })
  let buf: ArrayBuffer
  try {
    buf = await buildWorkbook(data)
  } catch (e) {
    setStatus({ kind: 'error', name, message: (e as Error).message })
    return
  }
  try {
    const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
    if (perm !== 'granted') {
      setStatus({ kind: 'needs-permission', name })
      return
    }
    const w = await handle.createWritable()
    await w.write(buf)
    await w.close()
    setStatus({ kind: 'ok', name, at: Date.now() })
  } catch {
    // Almost always: the file is open in Excel (Windows locks it).
    setStatus({ kind: 'locked', name })
  }
}

export async function connectXlsx(st: State) {
  if (!window.showSaveFilePicker) throw new Error('Tu navegador no permite conectar archivos (usa Chrome o Edge).')
  const h = await window.showSaveFilePicker({ suggestedName: 'postulaciones.xlsx', types: [{ description: 'Excel', accept: { [XLSX_MIME]: ['.xlsx'] } }] })
  handle = h
  await set(HANDLE_KEY, h, db)
  latest = st
  await writeXlsx(st)
}

export async function reconnectXlsx(st: State) {
  if (!handle) return
  const perm = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted'
  if (perm === 'granted') await writeXlsx(st)
}

export async function disconnectXlsx() {
  handle = null
  window.clearTimeout(timer)
  await del(HANDLE_KEY, db)
  setStatus({ kind: 'off' })
}

// A locked file usually gets unlocked when the user closes Excel and comes back.
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (status.kind === 'locked') void writeXlsx()
  })
}
