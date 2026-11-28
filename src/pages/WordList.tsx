import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Furigana, WordText } from '../components/Furigana'
import { allWords, examplePlain, LEVELS, matchPos, POS_FILTERS, POS_LABEL, type Level, type PosFilter } from '../data/vocab'
import { db, getSettings } from '../db/db'
import { diffDays, todayStr } from '../lib/date'
import { speakJapanese } from '../lib/speech'
import { isKnown } from '../lib/srs'

export function WordList() {
  const [level, setLevel] = useState<Level>('N5')
  const [pos, setPos] = useState<PosFilter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const data = useLiveQuery(async () => ({ cards: await db.cards.toArray(), settings: await getSettings() }), [])
  if (!data) return null

  const { cards, settings } = data
  const byId = new Map(cards.map((c) => [c.id, c]))
  const today = todayStr()
  const words = allWords.filter((w) => w.level === level && matchPos(w, pos))
  const learned = words.filter((w) => byId.has(w.id)).length

  function status(id: string): { text: string; cls: string } {
    const c = byId.get(id)
    if (!c) return { text: '아직', cls: '' }
    const days = diffDays(today, c.due)
    if (days <= 0) return { text: '오늘 복습', cls: 'due' }
    if (isKnown(c)) return { text: '외움', cls: 'known' }
    return { text: `${days}일 후`, cls: 'learning' }
  }

  return (
    <>
      <header>
        <h1>단어장</h1>
        <p className="sub">
          {level} · 배운 단어 {learned} / {words.length} · 누르면 예문과 발음
        </p>
      </header>
      <div className="chips">
        {LEVELS.map((l) => (
          <button key={l} className={`chip ${l === level ? 'on' : ''}`} onClick={() => setLevel(l)}>
            {l}
          </button>
        ))}
      </div>
      <div className="chips">
        {POS_FILTERS.map((f) => (
          <button key={f.id} className={`chip small ${f.id === pos ? 'on' : ''}`} onClick={() => setPos(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <ul className="word-list">
        {words.map((w) => {
          const s = status(w.id)
          const isOpen = open === w.id
          return (
            <li key={w.id} className={isOpen ? 'open' : ''}>
              <button
                className="wl-row"
                onClick={() => {
                  setOpen(isOpen ? null : w.id)
                  if (!isOpen) speakJapanese(w.reading, settings.rate)
                }}
              >
                <span className="wl-ja">
                  <WordText word={w.word} reading={w.reading} show={settings.furigana} />
                </span>
                <span className="wl-ko">{w.meaning}</span>
                <span className={`status ${s.cls}`}>{s.text}</span>
              </button>
              {isOpen && (
                <div className="wl-detail">
                  <div className="tiny">{POS_LABEL[w.pos]}</div>
                  <div className="example-ja">
                    <Furigana text={w.example} show={settings.furigana} />
                  </div>
                  <div className="ko">{w.exampleKo}</div>
                  <div className="row">
                    <button className="listen" onClick={() => speakJapanese(w.reading, settings.rate)}>
                      🔊 단어
                    </button>
                    <button className="listen" onClick={() => speakJapanese(examplePlain(w), settings.rate)}>
                      🔊 문장
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
