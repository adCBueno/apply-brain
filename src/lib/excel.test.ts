import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import type { State } from '../types'
import { buildWorkbook } from './excel'
import { blank, newApp, overviewSort } from './utils'

const st: State = {
  ...blank(),
  apps: [
    newApp({ id: '1', company: 'King', priority: 2, stage: 'applied', nextDate: '2026-12-01' }),
    newApp({ id: '2', company: 'Spotify', priority: 3, stage: 'applied', url: 'https://spotify.com' }),
    newApp({ id: '3', company: 'Klarna', priority: 3, stage: 'interview' }),
    newApp({ id: '4', company: 'Old Co', priority: 3, stage: 'rejected' }),
    newApp({ id: '5', company: 'Axis', priority: 2, stage: 'applied', nextDate: '2026-11-20' }),
  ],
}

describe('overview order', () => {
  it('active first, then priority, then most advanced stage, then soonest next step', () => {
    expect([...st.apps].sort(overviewSort).map((a) => a.company)).toEqual(['Klarna', 'Spotify', 'Axis', 'King', 'Old Co'])
  })
})

describe('Excel workbook', () => {
  it('has the 4 sheets, sorted overview rows, filters, frozen header and links', async () => {
    const buf = await buildWorkbook(st)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Overview', 'Resumen', 'Historial', 'Contactos'])
    const ws = wb.getWorksheet('Overview')!
    expect(ws.getRow(1).getCell(2).value).toBe('Empresa')
    const companies = [2, 3, 4, 5, 6].map((r) => ws.getRow(r).getCell(2).value)
    expect(companies).toEqual(['Klarna', 'Spotify', 'Axis', 'King', 'Old Co'])
    expect(ws.getRow(2).getCell(1).value).toBe('🔥 Soñada')
    expect(ws.autoFilter).toBeTruthy()
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 })
    const link = ws.getRow(3).getCell(18).value as { hyperlink: string }
    expect(link.hyperlink).toBe('https://spotify.com')
  })
})
