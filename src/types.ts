export type Kind = 'job' | 'thesis' | 'internship'
export type Stage = 'wishlist' | 'preparing' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'ghosted' | 'withdrawn'
export type WorkMode = '' | 'onsite' | 'hybrid' | 'remote'
export type EventType = 'note' | 'stage' | 'email' | 'interview' | 'followup'
export type View = 'hoy' | 'tablero' | 'lista' | 'contactos' | 'pitch' | 'rastro'

export interface AppEvent {
  id: string
  /** when it was logged */
  t: number
  type: EventType
  text: string
  /** scheduled date-time for interviews, "YYYY-MM-DDTHH:mm" (local) */
  at?: string
}

export interface Application {
  id: string
  company: string
  role: string
  kind: Kind
  url: string
  location: string
  workMode: WorkMode
  /** LinkedIn, referral, talent day… */
  source: string
  /** 3 = dream, 2 = good, 1 = backup */
  priority: number
  stage: Stage
  /** application deadline "YYYY-MM-DD" */
  deadline: string
  appliedAt?: number
  /** the single next thing to do, and when ("YYYY-MM-DD") */
  nextAction: string
  nextDate: string
  /** which CV file / version was sent */
  cvVersion: string
  /** the exact cover letter / motivation that was sent */
  coverLetter: string
  /** job description, saved before the posting disappears */
  jd: string
  notes: string
  requiresPermit: boolean
  requiresSwedish: boolean
  contactIds: string[]
  events: AppEvent[]
  created: number
  /** when it entered its current stage */
  stageAt: number
}

export interface Contact {
  id: string
  name: string
  title: string
  company: string
  email: string
  linkedin: string
  /** where/how we met */
  notes: string
  created: number
}

export interface Snippet {
  id: string
  title: string
  text: string
  created: number
}

export interface LogEntry {
  t: number
  m: string
}

export interface State {
  v: 1
  apps: Application[]
  contacts: Contact[]
  snippets: Snippet[]
  log: LogEntry[]
  updated: number
}
