import { describe, expect, it } from 'vitest'
import type { State } from '../types'
import {
  addDays,
  appsFromCSV,
  blank,
  daysUntil,
  icsAllDay,
  icsEvent,
  isoDate,
  kindFromText,
  newApp,
  normalize,
  parseCSV,
  sameCompany,
  setStage,
  silentApps,
  stageFromText,
  stats,
  toCSV,
} from './utils'

describe('setStage', () => {
  it('moving to applied stamps the date and schedules a follow-up in 7 days', () => {
    const now = new Date('2026-11-19T10:00:00')
    const a = newApp({ company: 'Spotify', role: 'iOS' })
    const msg = setStage(a, 'applied', now)
    expect(msg).toContain('Postulé')
    expect(a.appliedAt).toBe(now.getTime())
    expect(a.nextDate).toBe('2026-11-26')
    expect(a.events.at(-1)?.type).toBe('stage')
  })
  it('keeps an existing follow-up date', () => {
    const a = newApp({ nextDate: '2026-12-01', nextAction: 'x' })
    setStage(a, 'applied')
    expect(a.nextDate).toBe('2026-12-01')
  })
  it('closing an application clears the next action, same stage is a no-op', () => {
    const a = newApp({ nextAction: 'follow-up', nextDate: '2026-12-01', stage: 'applied' })
    expect(setStage(a, 'applied')).toBeNull()
    setStage(a, 'rejected')
    expect(a.nextAction).toBe('')
    expect(a.nextDate).toBe('')
  })
})

describe('dates', () => {
  it('daysUntil / addDays', () => {
    expect(daysUntil('2026-11-25', '2026-11-19')).toBe(6)
    expect(daysUntil('2026-11-18', '2026-11-19')).toBe(-1)
    expect(addDays(3, new Date('2026-12-30T12:00:00'))).toBe('2027-01-02')
    expect(isoDate(new Date('2026-01-05T23:00:00'))).toBe('2026-01-05')
  })
})

describe('duplicates, stats, ghosting', () => {
  const st: State = {
    ...blank(),
    apps: [
      newApp({ id: 'a', company: 'Ericsson AB', stage: 'applied', appliedAt: Date.now(), stageAt: Date.now() - 30 * 86_400_000 }),
      newApp({ id: 'b', company: 'Spotify', stage: 'interview', appliedAt: Date.now() - 20 * 86_400_000 }),
      newApp({ id: 'c', company: 'King', stage: 'wishlist' }),
    ],
  }
  it('matches company names loosely', () => {
    expect(sameCompany(st, 'ericsson').map((a) => a.id)).toEqual(['a'])
    expect(sameCompany(st, 'Ericsson AB', 'a')).toEqual([])
  })
  it('computes response rate over applied ones', () => {
    const s = stats(st)
    expect(s.applied).toBe(2)
    expect(s.responseRate).toBe(50)
    expect(s.thisWeek).toBe(1)
  })
  it('flags applications silent for 21+ days', () => {
    expect(silentApps(st).map((a) => a.id)).toEqual(['a'])
  })
})

describe('CSV', () => {
  it('parses quotes, commas and semicolon-separated files', () => {
    expect(parseCSV('a,b\n"x, y","he said ""hi"""')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ])
    expect(parseCSV('Empresa;Puesto\nKlarna;Mobile Dev')).toEqual([
      ['Empresa', 'Puesto'],
      ['Klarna', 'Mobile Dev'],
    ])
  })
  it('maps Spanish/English headers, statuses and thesis type; unknown columns go to notes', () => {
    const csv = 'Empresa,Puesto,Estado,Fecha,Sueldo\nEricsson,Thesis: AI dependencies,Postulado,15/10/2026,—\nKlarna,iOS Engineer,Entrevista,,45k\nAxis,SWE,,,'
    const { apps, matched } = appsFromCSV(parseCSV(csv))
    expect(matched).toEqual(expect.arrayContaining(['company', 'role', 'stage', 'applied']))
    expect(apps).toHaveLength(3)
    expect(apps[0]).toMatchObject({ company: 'Ericsson', kind: 'thesis', stage: 'applied' })
    expect(new Date(apps[0].appliedAt!).getMonth()).toBe(9)
    expect(apps[1].stage).toBe('interview')
    expect(apps[1].notes).toContain('Sueldo: 45k')
    expect(apps[2].stage).toBe('wishlist')
  })
  it('round-trips through toCSV', () => {
    const csv = toCSV([newApp({ company: 'A, Inc', role: 'Dev', stage: 'offer' })])
    const { apps } = appsFromCSV(parseCSV(csv))
    expect(apps[0]).toMatchObject({ company: 'A, Inc', role: 'Dev', stage: 'offer' })
  })
  it('stage / kind keyword helpers', () => {
    expect(stageFromText('Rejected', true)).toBe('rejected')
    expect(stageFromText('', false)).toBe('wishlist')
    expect(kindFromText('', 'Exjobb: ML')).toBe('thesis')
    expect(kindFromText('Summer internship')).toBe('internship')
  })
})

describe('ics', () => {
  it('builds a timed and an all-day event', () => {
    const t = icsEvent('Entrevista: Spotify', '2026-11-25T14:30', 45, 'Técnica, con Ana', 'https://x')
    expect(t).toContain('BEGIN:VEVENT')
    expect(t).toMatch(/DTSTART:\d{8}T\d{6}Z/)
    expect(t).toContain('SUMMARY:Entrevista: Spotify')
    expect(t).toContain('DESCRIPTION:Técnica\\, con Ana')
    const d = icsAllDay('Follow-up', '2026-12-31')
    expect(d).toContain('DTSTART;VALUE=DATE:20261231')
    expect(d).toContain('DTEND;VALUE=DATE:20270101')
  })
})

it('normalize fills defaults for old/partial backups', () => {
  const s = normalize({ v: 1, apps: [{ id: 'x', company: 'Y' }] })
  expect(s.apps[0].events).toEqual([])
  expect(s.apps[0].stage).toBe('wishlist')
  expect(s.contacts).toEqual([])
})
