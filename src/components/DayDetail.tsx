// 선택한 날짜에 공부한 내용 정리: 새 단어 / 복습, 맞힘·틀림
import { useLiveQuery } from 'dexie-react-hooks'
import { wordById, type Word } from '../data/vocab'
import { db } from '../db/db'
import { speakJapanese } from '../lib/speech'
import { WordText } from './Furigana'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

interface Row {
  word: Word
  correct?: boolean // undefined = 결과 기록 없음 (기록 기능 이전)
}

function WordRows({ rows, rate }: { rows: Row[]; rate: number }) {
  return (
    <ul className="day-words">
      {rows.map(({ word, correct }) => (
        <li key={word.id}>
          <button onClick={() => speakJapanese(word.reading, rate)}>
            <span className={`mark ${correct === undefined ? '' : correct ? 'good-text' : 'bad-text'}`}>
              {correct === undefined ? '·' : correct ? '✓' : '✗'}
            </span>
            <span className="dw-ja">
              <WordText word={word.word} reading={word.reading} />
            </span>
            <span className="dw-ko">{word.meaning}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function DayDetail({ date, rate }: { date: string; rate: number }) {
  const data = useLiveQuery(async () => {
    const [history, firstSeen, log] = await Promise.all([
      db.history.where('date').equals(date).toArray(),
      db.cards.where('firstSeen').equals(date).toArray(),
      db.logs.get(date),
    ])
    return { history, firstSeen, log }
  }, [date])

  const [y, m, d] = date.split('-').map(Number)
  const title = `${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`
  if (!data) return null
  const { history, firstSeen, log } = data

  // 같은 단어를 하루에 여러 번 풀었으면 첫 결과 기준
  const firstResult = new Map<string, boolean>()
  for (const h of history) if (!firstResult.has(h.wordId)) firstResult.set(h.wordId, h.correct)

  const newIds = new Set([...firstSeen.map((c) => c.id), ...history.filter((h) => h.isNew).map((h) => h.wordId)])
  const toRow = (id: string): Row | null => {
    const word = wordById.get(id)
    return word ? { word, correct: firstResult.get(id) } : null
  }
  const newRows = [...newIds].map(toRow).filter((r): r is Row => !!r)
  const reviewIds = [...new Set(history.filter((h) => !h.isNew && !newIds.has(h.wordId)).map((h) => h.wordId))]
  const reviewRows = reviewIds.map(toRow).filter((r): r is Row => !!r)

  const graded = [...firstResult.values()]
  const correct = graded.filter(Boolean).length
  const missingReviews = (log?.reviews ?? 0) > 0 && history.length === 0
  const speaking = log?.speaking ?? 0

  return (
    <div className="day-detail">
      <h3>{title}</h3>
      {speaking > 0 && (
        <p className="hint">
          🎤 말하기 녹음 <b>{speaking}</b>번
        </p>
      )}
      {newRows.length === 0 && reviewRows.length === 0 && !missingReviews ? (
        speaking > 0 ? null :
        <p className="hint">이 날은 공부 기록이 없어요.</p>
      ) : (
        <>
          <div className="day-stats">
            <span>
              새 단어 <b>{newRows.length}</b>
            </span>
            <span>
              복습 <b>{reviewRows.length}</b>
            </span>
            {graded.length > 0 && (
              <span>
                정답률 <b>{Math.round((correct / graded.length) * 100)}%</b>
              </span>
            )}
          </div>
          {newRows.length > 0 && (
            <>
              <h4>✨ 새로 배운 단어</h4>
              <WordRows rows={newRows} rate={rate} />
            </>
          )}
          {reviewRows.length > 0 && (
            <>
              <h4>🔁 복습한 단어</h4>
              <WordRows rows={reviewRows} rate={rate} />
            </>
          )}
          {missingReviews && <p className="tiny">※ 이 날의 문제별 결과는 기록 기능(v0.1.4) 이전이라 남아 있지 않아요.</p>}
          <p className="tiny">단어를 누르면 발음을 들을 수 있어요.</p>
        </>
      )}
    </div>
  )
}
