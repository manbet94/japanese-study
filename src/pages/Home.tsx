import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { DayDetail } from '../components/DayDetail'
import { allWords, POS_FILTERS } from '../data/vocab'
import { db, getSettings, saveSettings } from '../db/db'
import { addDays, todayStr } from '../lib/date'
import { getTodayCounts, type StudyMode } from '../lib/session'
import { calcStreak } from '../lib/streak'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Home({ onStart }: { onStart: (mode: StudyMode) => void }) {
  const today = todayStr()
  const data = useLiveQuery(async () => {
    const settings = await getSettings()
    const [counts, logs] = await Promise.all([getTodayCounts(today, settings), db.logs.toArray()])
    return { counts, logs, settings }
  }, [today])
  const [selected, setSelected] = useState<string | null>(null)

  if (!data) return null
  const { counts, logs, settings } = data
  const studied = new Set(logs.filter((l) => l.reviews > 0 || (l.speaking ?? 0) > 0).map((l) => l.date))
  const doneDates = new Set(logs.filter((l) => l.done).map((l) => l.date))
  const todayLog = logs.find((l) => l.date === today)
  const learnedToday = todayLog?.newLearned ?? 0
  const streak = calcStreak(doneDates, today)
  const learned = allWords.length - counts.unseen
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const posName = settings.newPos === 'all' ? '' : `${POS_FILTERS.find((f) => f.id === settings.newPos)?.label} `

  return (
    <>
      <header>
        <h1>日本語 매일 20분</h1>
        <p className="sub">목표: SJPT 레벨 5 · v0.2.1</p>
      </header>

      <section className="card streak">
        <div className="streak-num">🔥 {streak}일 연속</div>
        <div className="week">
          {week.map((d) => {
            const [y, m, day] = d.split('-').map(Number)
            const cls = doneDates.has(d) ? 'on' : studied.has(d) ? 'part' : ''
            return (
              <button
                key={d}
                className={`day ${cls} ${d === today ? 'today' : ''} ${d === selected ? 'sel' : ''}`}
                onClick={() => setSelected(d === selected ? null : d)}
              >
                <span>{WEEKDAYS[new Date(y, m - 1, day).getDay()]}</span>
                <i />
              </button>
            )
          })}
        </div>
        {selected ? (
          <DayDetail date={selected} rate={settings.rate} />
        ) : (
          <p className="tiny center">요일을 누르면 그날 공부한 내용을 볼 수 있어요</p>
        )}
      </section>

      <section className="card">
        <h2>🔁 복습</h2>
        {counts.due > 0 ? (
          <>
            <p className="hint">
              오늘 복습할 단어 <b>{counts.due}</b>개 · 약 {Math.max(1, Math.ceil(counts.due * 0.3))}분
            </p>
            <button className="primary" onClick={() => onStart('review')}>
              복습하기
            </button>
          </>
        ) : (
          <p className="ok">{doneDates.has(today) ? '오늘 복습 완료! 👏' : '오늘 복습할 단어가 없어요.'}</p>
        )}
      </section>

      <section className="card">
        <h2>✨ 새 단어</h2>
        <p className="hint">
          오늘 배운 새 단어 <b>{learnedToday}</b>개 · 시간 되는 만큼 세트를 반복하세요
        </p>
        {counts.unseen > 0 && (
          <>
            <p className="tiny">어떤 단어를 배울까요? (숫자는 남은 단어)</p>
            <div className="chips">
              {POS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`chip ${f.id === settings.newPos ? 'on' : ''}`}
                  onClick={() => saveSettings({ newPos: f.id })}
                >
                  {f.label} {counts.unseenByPos[f.id]}
                </button>
              ))}
            </div>
          </>
        )}
        {counts.nextSet > 0 ? (
          <button className={counts.due > 0 ? 'secondary big' : 'primary'} onClick={() => onStart('new')}>
            {posName}새 단어 {counts.nextSet}개 배우기 {learnedToday > 0 && '(한 세트 더)'}
          </button>
        ) : counts.unseen > 0 ? (
          <p className="ok">이 품사의 단어는 모두 배웠어요! 다른 품사를 골라 보세요.</p>
        ) : (
          <p className="ok">준비된 단어를 모두 배웠어요! 🎉</p>
        )}
        <div className="progress">
          <div style={{ width: `${(learned / allWords.length) * 100}%` }} />
        </div>
        <p className="tiny">
          전체 진도 {learned} / {allWords.length}
        </p>
      </section>

      <section className="card muted">
        <h2>다음 업데이트</h2>
        <ul>
          <li>v0.2.2 SJPT 2부·7부 (그림 보고 답하기, 4컷 이야기)</li>
          <li>v0.2.3 SJPT 5부·6부 (의견 말하기, 상황 대응)</li>
          <li>v0.2.4 내가 말한 내용을 글자로 확인 (음성 인식)</li>
          <li>v0.3 문법 레슨 + 문장 만들기</li>
        </ul>
      </section>
    </>
  )
}
