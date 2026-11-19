import { Empty, Head } from '../components/common'
import { useAppState } from '../lib/store'
import { fmtDay, fmtTime } from '../lib/utils'
import type { LogEntry } from '../types'

export function Rastro() {
  const s = useAppState()
  const days: { day: string; entries: LogEntry[] }[] = []
  for (const e of s.log) {
    const day = fmtDay(e.t)
    if (!days.length || days[days.length - 1].day !== day) days.push({ day, entries: [] })
    days[days.length - 1].entries.push(e)
  }
  return (
    <>
      <Head title="Rastro" sub="Todo lo que hiciste, en orden. Para cuando no recuerdas cuándo mandaste qué." />
      {!s.log.length ? (
        <Empty icon="🧭">Aquí irá apareciendo todo lo que hagas, en orden.</Empty>
      ) : (
        days.map((d) => (
          <div key={d.day}>
            <div className="tl-day">{d.day}</div>
            <div className="tl">
              {d.entries.map((e, i) => (
                <div key={e.t + '-' + i}>
                  <time>{fmtTime(e.t)}</time>
                  {e.m}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
