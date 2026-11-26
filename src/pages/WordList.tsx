import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { allWords, type Level } from '../data/vocab'
import { db } from '../db/db'
import { diffDays, todayStr } from '../lib/date'
import { speakJapanese } from '../lib/speech'

export function WordList() {
  const [level, setLevel] = useState<Level>('N5')
  const cards = useLiveQuery(() => db.cards.toArray(), [])
  if (!cards) return null

  const byId = new Map(cards.map((c) => [c.id, c]))
  const today = todayStr()
  const words = allWords.filter((w) => w.level === level)
  const learned = words.filter((w) => byId.has(w.id)).length

  function status(id: string): { text: string; cls: string } {
    const c = byId.get(id)
    if (!c) return { text: '아직', cls: '' }
    const days = diffDays(today, c.due)
    if (days <= 0) return { text: '오늘 복습', cls: 'due' }
    if (c.interval >= 21) return { text: '외움', cls: 'known' }
    return { text: `${days}일 후`, cls: 'learning' }
  }

  return (
    <>
      <header>
        <h1>단어장</h1>
        <p className="sub">
          {level} · 배운 단어 {learned} / {words.length} · 눌러서 발음 듣기
        </p>
      </header>
      <div className="chips">
        {(['N5', 'N4'] as Level[]).map((l) => (
          <button key={l} className={`chip ${l === level ? 'on' : ''}`} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <ul className="word-list">
        {words.map((w) => {
          const s = status(w.id)
          return (
            <li key={w.id}>
              <button onClick={() => speakJapanese(w.reading)}>
                <span className="wl-ja" lang="ja">
                  {w.word}
                  {w.reading !== w.word && <small>{w.reading}</small>}
                </span>
                <span className="wl-ko">{w.meaning}</span>
                <span className={`status ${s.cls}`}>{s.text}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
