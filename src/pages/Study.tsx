import { useEffect, useState } from 'react'
import { bumpLog, db, getSettings, type Settings } from '../db/db'
import { todayStr } from '../lib/date'
import { buildQueue, type QueueItem } from '../lib/session'
import { speakJapanese } from '../lib/speech'
import { intervalLabel, nextInterval, review, type Grade } from '../lib/srs'

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: '다시' },
  { grade: 'hard', label: '어려움' },
  { grade: 'good', label: '알맞음' },
  { grade: 'easy', label: '쉬움' },
]

export function Study({ onExit }: { onExit: () => void }) {
  const [today] = useState(todayStr)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  useEffect(() => {
    getSettings().then(async (s) => {
      setSettings(s)
      setQueue(await buildQueue(today, s))
    })
  }, [today])

  const item = queue?.[idx]
  const rate = settings?.rate ?? 0.9

  // 자동 발음: 일본어가 앞면이면 카드가 나올 때, 한국어가 앞면이면 정답을 볼 때
  useEffect(() => {
    if (!item || !settings?.autoPlay) return
    if ((item.front === 'ja') !== revealed) speakJapanese(item.word.reading, rate)
  }, [item, revealed, settings, rate])

  if (!queue || !settings) return null

  async function grade(g: Grade) {
    if (!item || !queue || busy) return
    setBusy(true)
    const updated = review(item.card, g, today)
    await db.cards.put(updated)
    await bumpLog(today, { reviews: 1, newLearned: item.isNew ? 1 : 0 })
    const next = g === 'again' ? [...queue, { ...item, card: updated, isNew: false }] : queue
    if (idx + 1 >= next.length) await bumpLog(today, { done: true })
    setQueue(next)
    setIdx(idx + 1)
    setRevealed(false)
    setReviewed((n) => n + 1)
    setBusy(false)
  }

  if (!item) {
    return (
      <div className="study">
        <div className="study-done">
          {reviewed > 0 ? (
            <>
              <div className="big-emoji">🎉</div>
              <h2>오늘 단어 학습 완료!</h2>
              <p className="hint">{reviewed}장을 넘겼어요. 내일 복습할 단어가 기다리고 있어요.</p>
            </>
          ) : (
            <>
              <h2>오늘 할 단어가 없어요</h2>
              <p className="hint">설정에서 하루 새 단어 수를 늘릴 수 있어요.</p>
            </>
          )}
          <button className="primary" onClick={onExit}>
            홈으로
          </button>
        </div>
      </div>
    )
  }

  const { word } = item
  const showReading = word.reading !== word.word

  return (
    <div className="study">
      <div className="study-top">
        <button className="icon" onClick={onExit} aria-label="닫기">
          ✕
        </button>
        <div className="progress thin">
          <div style={{ width: `${(idx / queue.length) * 100}%` }} />
        </div>
        <span className="tiny">
          {idx + 1}/{queue.length}
        </span>
      </div>

      <div className="flash">
        <span className={`badge ${item.isNew ? 'new' : ''}`}>
          {item.isNew ? '새 단어' : '복습'} · {word.level}
        </span>

        {item.front === 'ja' ? (
          <button className="word-big" lang="ja" onClick={() => speakJapanese(word.reading, rate)}>
            {word.word}
          </button>
        ) : (
          <div className="prompt">
            <div className="meaning-big">{word.meaning}</div>
            {!revealed && <p className="hint">🗣️ 일본어로 소리 내어 말해 보세요</p>}
          </div>
        )}

        {revealed && (
          <div className="answer">
            {item.front === 'ko' && (
              <button className="word-big" lang="ja" onClick={() => speakJapanese(word.reading, rate)}>
                {word.word}
              </button>
            )}
            {showReading && (
              <div className="reading" lang="ja">
                {word.reading}
              </div>
            )}
            {item.front === 'ja' && <div className="meaning">{word.meaning}</div>}
            <button className="example" onClick={() => speakJapanese(word.example, rate)}>
              <span lang="ja">🔊 {word.example}</span>
              <span className="ko">{word.exampleKo}</span>
            </button>
          </div>
        )}
      </div>

      <div className="study-actions">
        {!revealed ? (
          <button className="primary" onClick={() => setRevealed(true)}>
            정답 보기
          </button>
        ) : (
          <div className="grades">
            {GRADES.map(({ grade: g, label }) => (
              <button key={g} className={`grade ${g}`} disabled={busy} onClick={() => grade(g)}>
                <b>{label}</b>
                <span>{intervalLabel(nextInterval(item.card, g))}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
