import { useEffect, useState } from 'react'
import { Furigana, WordText } from '../components/Furigana'
import { examplePlain, type Word } from '../data/vocab'
import { bumpLog, db, getSettings, type Settings } from '../db/db'
import { todayStr } from '../lib/date'
import { buildQueue, getTodayCounts, quizItem, type QueueItem, type StudyMode, type TodayCounts } from '../lib/session'
import { speakJapanese } from '../lib/speech'
import { nextInterval, review } from '../lib/srs'

function ListenButton({ text, rate, label = '다시 듣기' }: { text: string; rate: number; label?: string }) {
  return (
    <button className="listen" onClick={() => speakJapanese(text, rate)}>
      🔊 {label}
    </button>
  )
}

function ExampleBox({ word, rate, furigana, showKo }: { word: Word; rate: number; furigana: boolean; showKo: boolean }) {
  return (
    <div className="example">
      <div className="example-ja">
        <Furigana text={word.example} show={furigana} />
      </div>
      {showKo && <div className="ko">{word.exampleKo}</div>}
      <ListenButton text={examplePlain(word)} rate={rate} label="문장 듣기" />
    </div>
  )
}

export function Study({
  mode,
  onExit,
  onStart,
}: {
  mode: StudyMode
  onExit: () => void
  onStart: (mode: StudyMode) => void
}) {
  const [today] = useState(todayStr)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Word | null>(null)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [busy, setBusy] = useState(false)
  const [after, setAfter] = useState<TodayCounts | null>(null) // 끝난 뒤 남은 양

  useEffect(() => {
    getSettings().then(async (s) => {
      setSettings(s)
      setQueue(await buildQueue(today, s, mode))
    })
  }, [today, mode])

  const item = queue?.[idx]
  const rate = settings?.rate ?? 0.9

  // 자동 발음: 새 단어 소개, 일본어를 보고 푸는 문제는 카드가 나올 때
  useEffect(() => {
    if (!item || !settings?.autoPlay) return
    if (item.kind === 'intro' || item.front === 'ja') speakJapanese(item.word.reading, rate)
  }, [item, settings, rate])

  // 다 끝나면: 남은 복습이 없으면 오늘 완료 표시
  const finished = !!queue && !!settings && idx >= queue.length
  useEffect(() => {
    if (!finished || !settings) return
    getTodayCounts(today, settings).then(async (c) => {
      if (c.due === 0 && (await db.logs.get(today))?.reviews) await bumpLog(today, { done: true })
      setAfter(c)
    })
  }, [finished, settings, today])

  if (!queue || !settings) return null
  const furigana = settings.furigana

  function next() {
    setIdx((i) => i + 1)
    setPicked(null)
    window.scrollTo(0, 0)
  }

  async function choose(choice: Word) {
    if (!item || item.kind !== 'quiz' || picked || busy || !queue) return
    setBusy(true)
    setPicked(choice)
    const correct = choice.id === item.word.id
    if (settings!.autoPlay) speakJapanese(item.word.reading, rate)
    if (!item.retry) {
      setScore((s) => (correct ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }))
      const updated = review(item.card, correct, today)
      await db.cards.put(updated)
      await bumpLog(today, { reviews: 1, newLearned: item.isNew ? 1 : 0 })
      if (!correct) setQueue([...queue, quizItem(item.word, updated, false, item.front, true)])
    }
    setBusy(false)
  }

  // ── 끝 화면
  if (!item) {
    const total = score.correct + score.wrong
    return (
      <div className="study">
        <div className="study-done">
          {total > 0 ? (
            <>
              <div className="big-emoji">🎉</div>
              <h2>{mode === 'new' ? '세트 완료!' : '복습 완료!'}</h2>
              <p className="hint">
                맞힘 <b className="good-text">{score.correct}</b> · 틀림 <b className="bad-text">{score.wrong}</b>
              </p>
              <p className="tiny">맞힌 단어는 며칠 뒤에, 틀린 단어는 내일 다시 나와요.</p>
            </>
          ) : (
            <h2>지금 할 단어가 없어요</h2>
          )}
          <div className="done-actions">
            {after && after.due > 0 && (
              <button className="primary" onClick={() => onStart('review')}>
                복습하기 ({after.due})
              </button>
            )}
            {after && after.nextSet > 0 && (
              <button className={after.due > 0 ? 'secondary big' : 'primary'} onClick={() => onStart('new')}>
                새 단어 {after.nextSet}개 더 배우기
              </button>
            )}
            <button className="secondary big" onClick={onExit}>
              오늘은 여기까지 · 홈으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { word } = item
  const isRight = picked && item.kind === 'quiz' && picked.id === word.id

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

      {item.kind === 'intro' ? (
        // ── 새 단어 소개
        <div className="flash">
          <span className="badge new">새 단어 · {word.level}</span>
          <div className="word-big">
            <WordText word={word.word} reading={word.reading} />
          </div>
          <ListenButton text={word.reading} rate={rate} />
          <div className="meaning">{word.meaning}</div>
          <ExampleBox word={word} rate={rate} furigana showKo />
          <button className="primary" onClick={next}>
            외웠어요 →
          </button>
        </div>
      ) : (
        // ── 3지선다 문제
        <div className="flash">
          <span className={`badge ${item.isNew ? 'new' : ''}`}>
            {item.retry ? '다시 풀기' : item.isNew ? '새 단어 확인' : '복습'} · {word.level}
          </span>

          {item.front === 'ja' ? (
            <>
              <div className="word-big">
                <WordText word={word.word} reading={word.reading} show={furigana} />
              </div>
              <ListenButton text={word.reading} rate={rate} />
              {!picked && (
                <div className="context example-ja">
                  <Furigana text={word.example} show={furigana} />
                </div>
              )}
              {!picked && <p className="question">뜻을 고르세요</p>}
            </>
          ) : (
            <>
              <div className="meaning-big">{word.meaning}</div>
              {!picked && <p className="question">🗣️ 먼저 소리 내어 말해 보고, 일본어를 고르세요</p>}
            </>
          )}

          <div className="choices">
            {item.choices.map((c) => {
              const state = !picked ? '' : c.id === word.id ? 'right' : c.id === picked.id ? 'wrong' : 'dim'
              return (
                <button key={c.id} className={`choice ${state}`} onClick={() => choose(c)} disabled={!!picked}>
                  {item.front === 'ja' ? c.meaning : <WordText word={c.word} reading={c.reading} show={furigana} />}
                </button>
              )
            })}
          </div>

          {picked && (
            <>
              <div className="result-bar">
                <span className={`result ${isRight ? 'good-text' : 'bad-text'}`}>
                  {isRight
                    ? `⭕ 정답!${item.retry ? '' : ` ${nextInterval(item.card, true)}일 후 복습`}`
                    : `❌ 오답${item.retry ? '' : ' · 내일 다시'}`}
                </span>
                <button className="primary next" onClick={next} disabled={busy}>
                  다음 →
                </button>
              </div>
              <div className="answer">
                {item.front === 'ko' && (
                  <>
                    <div className="word-mid">
                      <WordText word={word.word} reading={word.reading} />
                    </div>
                    <ListenButton text={word.reading} rate={rate} />
                  </>
                )}
                <ExampleBox word={word} rate={rate} furigana showKo />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
