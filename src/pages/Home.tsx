import { useLiveQuery } from 'dexie-react-hooks'
import { allWords } from '../data/vocab'
import { db, getSettings } from '../db/db'
import { addDays, todayStr } from '../lib/date'
import { getTodayCounts, type StudyMode } from '../lib/session'
import { calcStreak } from '../lib/streak'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Home({ onStart }: { onStart: (mode: StudyMode) => void }) {
  const today = todayStr()
  const data = useLiveQuery(async () => {
    const settings = await getSettings()
    const [counts, logs, learned] = await Promise.all([
      getTodayCounts(today, settings),
      db.logs.toArray(),
      db.cards.count(),
    ])
    return { counts, logs, learned }
  }, [today])

  if (!data) return null
  const { counts, logs, learned } = data
  const doneDates = new Set(logs.filter((l) => l.done).map((l) => l.date))
  const todayLog = logs.find((l) => l.date === today)
  const streak = calcStreak(doneDates, today)
  const remaining = counts.due + counts.newLeft
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  return (
    <>
      <header>
        <h1>日本語 매일 20분</h1>
        <p className="sub">목표: SJPT 레벨 5 · v0.1.2</p>
      </header>

      <section className="card streak">
        <div className="streak-num">🔥 {streak}일 연속</div>
        <div className="week">
          {week.map((d) => {
            const [y, m, day] = d.split('-').map(Number)
            return (
              <div key={d} className={`day ${doneDates.has(d) ? 'on' : ''} ${d === today ? 'today' : ''}`}>
                <span>{WEEKDAYS[new Date(y, m - 1, day).getDay()]}</span>
                <i />
              </div>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h2>📚 오늘의 단어</h2>
        {remaining === 0 ? (
          <p className="ok">오늘 단어 학습 완료! 내일 또 만나요. ({todayLog?.reviews ?? 0}문제 풀이)</p>
        ) : (
          <p className="hint">
            복습 <b>{counts.due}</b>개 · 새 단어 <b>{counts.newLeft}</b>개 · 약 {Math.max(1, Math.ceil(remaining * 0.4))}분
          </p>
        )}
        <button className="primary" onClick={() => onStart('all')} disabled={remaining === 0}>
          {remaining === 0 ? '오늘 할 단어 없음' : todayLog?.reviews ? '이어서 하기' : '시작하기'}
        </button>
        {counts.due > 0 && counts.newLeft > 0 && (
          <div className="row">
            <button className="secondary" onClick={() => onStart('review')}>
              복습만 ({counts.due})
            </button>
            <button className="secondary" onClick={() => onStart('new')}>
              새 단어만 ({counts.newLeft})
            </button>
          </div>
        )}
        <div className="progress">
          <div style={{ width: `${(learned / allWords.length) * 100}%` }} />
        </div>
        <p className="tiny">
          배운 단어 {learned} / {allWords.length}
        </p>
      </section>

      <section className="card muted">
        <h2>다음 업데이트</h2>
        <ul>
          <li>v0.2 SJPT 말하기 연습 (녹음·타이머·모범답안)</li>
          <li>v0.3 문법 레슨 + 문장 만들기</li>
        </ul>
      </section>
    </>
  )
}
