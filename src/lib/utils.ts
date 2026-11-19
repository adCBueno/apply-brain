import type { Application, Kind, Stage, State } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const STAGES: Record<Stage, { label: string; icon: string; color: string; active: boolean }> = {
  wishlist: { label: 'Me interesa', icon: '⭐', color: '#8a7f75', active: true },
  preparing: { label: 'Preparando', icon: '✏️', color: '#a67c10', active: true },
  applied: { label: 'Postulé', icon: '📨', color: '#3d5f8f', active: true },
  screening: { label: 'En contacto', icon: '📞', color: '#2f8a99', active: true },
  interview: { label: 'Entrevistas', icon: '🗣️', color: '#8a4f9e', active: true },
  offer: { label: 'Oferta', icon: '🎉', color: '#3f7a63', active: true },
  rejected: { label: 'Rechazada', icon: '❌', color: '#b3261e', active: false },
  ghosted: { label: 'Sin respuesta', icon: '👻', color: '#7b726a', active: false },
  withdrawn: { label: 'Me retiré', icon: '↩️', color: '#7b726a', active: false },
}
export const ACTIVE_STAGES = (Object.keys(STAGES) as Stage[]).filter((s) => STAGES[s].active)
export const CLOSED_STAGES = (Object.keys(STAGES) as Stage[]).filter((s) => !STAGES[s].active)

export const KINDS: Record<Kind, [string, string]> = {
  job: ['💼', 'Trabajo'],
  thesis: ['🎓', 'Tesis'],
  internship: ['🌱', 'Práctica'],
}

export const FOLLOW_UP_DAYS = 7
export const GHOST_DAYS = 21

export function blank(): State {
  return { v: 1, apps: [], contacts: [], snippets: [], log: [], updated: 0 }
}

export function newApp(over: Partial<Application> = {}): Application {
  const now = Date.now()
  return {
    id: uid(),
    company: '',
    role: '',
    kind: 'job',
    url: '',
    location: '',
    workMode: '',
    source: '',
    priority: 2,
    stage: 'wishlist',
    deadline: '',
    nextAction: '',
    nextDate: '',
    cvVersion: '',
    coverLetter: '',
    jd: '',
    notes: '',
    requiresPermit: false,
    requiresSwedish: false,
    contactIds: [],
    events: [],
    created: now,
    stageAt: now,
    ...over,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalize(raw: any): State {
  const s = { ...blank(), ...(raw || {}) }
  s.v = 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s.apps = (s.apps || []).map((a: any) => ({ ...newApp(), ...a, contactIds: a.contactIds || [], events: a.events || [] }))
  s.contacts = s.contacts || []
  s.snippets = s.snippets || []
  s.log = s.log || []
  return s as State
}

/* ---------- dates ("YYYY-MM-DD" in local time) ---------- */
export function isoDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function addDays(n: number, from = new Date()): string {
  const d = new Date(from)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}
export const daysSince = (t: number, now = Date.now()) => Math.floor((now - t) / 86_400_000)
/** days from today until an ISO date (negative = past) */
export function daysUntil(iso: string, today = isoDate()): number {
  const a = new Date(iso + 'T00:00:00')
  const b = new Date(today + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}
export function relDay(iso: string, today = isoDate()): string {
  const n = daysUntil(iso, today)
  if (n === 0) return 'hoy'
  if (n === 1) return 'mañana'
  if (n === -1) return 'ayer'
  if (n < 0) return `hace ${-n} días`
  if (n < 7) return `en ${n} días`
  return new Date(iso + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short' })
export const fmtDateTime = (local: string) =>
  new Date(local).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export function fmtDay(t: number, now = new Date()): string {
  const d = new Date(t)
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Hoy'
  if (d.toDateString() === y.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const appLabel = (a: Pick<Application, 'company' | 'role'>) => `${a.company || 'Sin empresa'}${a.role ? ' · ' + a.role : ''}`

/**
 * Move an application to a stage, with the automatic side effects:
 * applied -> date + follow-up in 7 days; interview -> prep reminder; closed -> clear next action.
 * Mutates `a`, returns a log message (or null if nothing changed).
 */
export function setStage(a: Application, stage: Stage, now = new Date()): string | null {
  if (a.stage === stage) return null
  a.stage = stage
  a.stageAt = now.getTime()
  a.events.push({ id: uid(), t: now.getTime(), type: 'stage', text: `→ ${STAGES[stage].label}` })
  if (stage === 'applied') {
    a.appliedAt = a.appliedAt || now.getTime()
    if (!a.nextDate) {
      a.nextAction = 'Hacer follow-up si no responden'
      a.nextDate = addDays(FOLLOW_UP_DAYS, now)
    }
  }
  if (stage === 'interview' && !a.nextAction) a.nextAction = 'Preparar la entrevista'
  if (!STAGES[stage].active) {
    a.nextAction = ''
    a.nextDate = ''
  }
  return `${appLabel(a)} → ${STAGES[stage].icon} ${STAGES[stage].label}`
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(ab|inc|ltd|gmbh|as|oy|corp|llc|group)\b/g, '')
    .replace(/[^a-z0-9]/g, '')

/** Other applications to the same company (to avoid applying twice by accident). */
export function sameCompany(st: State, company: string, excludeId?: string): Application[] {
  const c = norm(company)
  if (!c) return []
  return st.apps.filter((a) => a.id !== excludeId && norm(a.company) === c)
}

export function stats(st: State, now = Date.now()) {
  const applied = st.apps.filter((a) => a.appliedAt)
  const responded = applied.filter((a) => ['screening', 'interview', 'offer', 'rejected'].includes(a.stage))
  const weekAgo = now - 7 * 86_400_000
  return {
    applied: applied.length,
    thisWeek: applied.filter((a) => (a.appliedAt || 0) >= weekAgo).length,
    responseRate: applied.length ? Math.round((responded.length / applied.length) * 100) : 0,
    interviews: st.apps.filter((a) => a.stage === 'interview').length,
    offers: st.apps.filter((a) => a.stage === 'offer').length,
  }
}

export const STAGE_ORDER = Object.keys(STAGES) as Stage[]
export const PRIORITY_LABEL: Record<number, string> = { 3: '🔥 Soñada', 2: 'Buena', 1: 'Plan B' }

/**
 * Overview order: active before closed, then priority (dream first),
 * then the most advanced stage, then the soonest next step.
 */
export function overviewSort(a: Application, b: Application): number {
  const closed = (x: Application) => (STAGES[x.stage].active ? 0 : 1)
  return (
    closed(a) - closed(b) ||
    b.priority - a.priority ||
    STAGE_ORDER.indexOf(b.stage) - STAGE_ORDER.indexOf(a.stage) ||
    (a.nextDate || '9999').localeCompare(b.nextDate || '9999') ||
    a.company.localeCompare(b.company)
  )
}

/** Applications waiting at "applied" for too long without any movement. */
export const silentApps = (st: State, now = Date.now()) =>
  st.apps.filter((a) => a.stage === 'applied' && daysSince(a.stageAt, now) >= GHOST_DAYS)

/* ---------- CSV ---------- */
const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(apps: Application[]): string {
  const head = ['company', 'role', 'type', 'stage', 'applied', 'deadline', 'next_action', 'next_date', 'location', 'work_mode', 'source', 'priority', 'cv_version', 'url', 'notes']
  const rows = apps.map((a) => [
    a.company,
    a.role,
    KINDS[a.kind][1],
    STAGES[a.stage].label,
    a.appliedAt ? isoDate(new Date(a.appliedAt)) : '',
    a.deadline,
    a.nextAction,
    a.nextDate,
    a.location,
    a.workMode,
    a.source,
    a.priority,
    a.cvVersion,
    a.url,
    a.notes,
  ])
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
}

/** RFC-4180-ish parser; auto-detects "," vs ";" (Excel in many locales uses ";"). */
export function parseCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] || ''
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') q = false
      else cell += c
    } else if (c === '"') q = true
    else if (c === sep) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((x) => x.trim())) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim())) rows.push(row)
  return rows
}

const ALIASES: Record<string, string[]> = {
  company: ['company', 'empresa', 'compania', 'organization', 'organisation', 'employer', 'foretag'],
  role: ['role', 'position', 'title', 'job title', 'puesto', 'cargo', 'rol', 'job', 'posicion', 'thesis', 'tesis'],
  url: ['url', 'link', 'enlace', 'job link', 'posting', 'job url'],
  stage: ['status', 'stage', 'estado', 'etapa'],
  applied: ['applied', 'date applied', 'applied on', 'fecha', 'fecha de postulacion', 'application date', 'submitted', 'date'],
  location: ['location', 'ubicacion', 'city', 'ciudad', 'lugar'],
  notes: ['notes', 'notas', 'comments', 'comentarios', 'note'],
  deadline: ['deadline', 'fecha limite', 'closing date', 'last day', 'sista ansokningsdag'],
  kind: ['type', 'tipo', 'kind', 'category', 'categoria'],
  source: ['source', 'fuente', 'via', 'origen'],
  cv: ['cv', 'resume', 'cv version', 'resume version'],
}

const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()

export function stageFromText(t: string, hasApplied: boolean): Stage {
  const s = plain(t)
  if (/offer|oferta|erbjudande/.test(s)) return 'offer'
  if (/interview|entrevista|interju/.test(s)) return 'interview'
  if (/screen|phone|recruiter|contact|llamada|test|assessment/.test(s)) return 'screening'
  if (/reject|rechaz|declin|denied|no seleccion|avslag/.test(s)) return 'rejected'
  if (/ghost|no response|sin respuesta|no answer/.test(s)) return 'ghosted'
  if (/withdr|retir|desist/.test(s)) return 'withdrawn'
  if (/applied|postul|submitted|enviad|sent|aplicad|sokt/.test(s)) return 'applied'
  if (/prepar|draft|applying|in progress|borrador|en proceso/.test(s)) return 'preparing'
  if (/wish|saved|interest|to apply|pendiente|evaluat|idea|guardad/.test(s)) return 'wishlist'
  return hasApplied ? 'applied' : 'wishlist'
}

export function kindFromText(...texts: string[]): Kind {
  const s = plain(texts.join(' '))
  if (/thesis|tesis|exjobb|master project|degree project/.test(s)) return 'thesis'
  if (/intern|practica|praktik|trainee|summer/.test(s)) return 'internship'
  return 'job'
}

function parseDate(v: string): number | undefined {
  const s = v.trim()
  if (!s) return undefined
  const dmy = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/)
  if (dmy) {
    const y = Number(dmy[3].length === 2 ? '20' + dmy[3] : dmy[3])
    const d = new Date(y, Number(dmy[2]) - 1, Number(dmy[1]))
    return isNaN(d.getTime()) ? undefined : d.getTime()
  }
  const t = Date.parse(s)
  return isNaN(t) ? undefined : t
}

/** Turn CSV rows (first row = headers) into applications. Unknown columns are appended to notes. */
export function appsFromCSV(rows: string[][]): { apps: Application[]; matched: string[] } {
  if (rows.length < 2) return { apps: [], matched: [] }
  const headers = rows[0].map(plain)
  const col: Record<string, number> = {}
  for (const [field, names] of Object.entries(ALIASES)) {
    const i = headers.findIndex((h, idx) => names.includes(h) && !Object.values(col).includes(idx))
    if (i >= 0) col[field] = i
  }
  const used = new Set(Object.values(col))
  const get = (r: string[], f: string) => (col[f] != null ? (r[col[f]] || '').trim() : '')
  const apps = rows
    .slice(1)
    .map((r) => {
      const company = get(r, 'company')
      const role = get(r, 'role')
      if (!company && !role) return null
      const appliedAt = parseDate(get(r, 'applied'))
      const stage = stageFromText(get(r, 'stage'), !!appliedAt)
      const extra = r
        .map((v, i) => (!used.has(i) && v.trim() ? `${rows[0][i]}: ${v.trim()}` : ''))
        .filter(Boolean)
        .join('\n')
      const deadlineTs = parseDate(get(r, 'deadline'))
      const now = Date.now()
      return newApp({
        company,
        role,
        url: get(r, 'url'),
        location: get(r, 'location'),
        source: get(r, 'source'),
        cvVersion: get(r, 'cv'),
        kind: kindFromText(get(r, 'kind'), role),
        stage,
        appliedAt: appliedAt ?? (['wishlist', 'preparing'].includes(stage) ? undefined : now),
        deadline: deadlineTs ? isoDate(new Date(deadlineTs)) : '',
        notes: [get(r, 'notes'), extra].filter(Boolean).join('\n'),
        stageAt: appliedAt ?? now,
        events: [{ id: uid(), t: now, type: 'note', text: 'Importada desde CSV' }],
      })
    })
    .filter((a): a is Application => !!a)
  return { apps, matched: Object.keys(col) }
}

/* ---------- calendar (.ics) ---------- */
const icsEsc = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
const icsUtc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Timed event (interview). `start` is a local "YYYY-MM-DDTHH:mm". */
export function icsEvent(title: string, start: string, minutes = 60, description = '', url = ''): string {
  const s = new Date(start)
  const e = new Date(s.getTime() + minutes * 60_000)
  return wrapIcs([`DTSTART:${icsUtc(s)}`, `DTEND:${icsUtc(e)}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'END:VALARM'], title, description, url)
}

/** All-day reminder (follow-up, deadline). `day` is "YYYY-MM-DD". */
export function icsAllDay(title: string, day: string, description = '', url = ''): string {
  const d = day.replace(/-/g, '')
  const next = addDays(1, new Date(day + 'T00:00:00')).replace(/-/g, '')
  return wrapIcs([`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${next}`], title, description, url)
}

function wrapIcs(body: string[], title: string, description: string, url: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Apply Brain//ES',
    'BEGIN:VEVENT',
    `UID:${uid()}@apply-brain`,
    `DTSTAMP:${icsUtc(new Date())}`,
    `SUMMARY:${icsEsc(title)}`,
    ...(description ? [`DESCRIPTION:${icsEsc(description)}`] : []),
    ...(url ? [`URL:${url}`] : []),
    ...body,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'evento'
