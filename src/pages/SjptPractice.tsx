// SJPT 부별 연습: 질문 듣기 → 준비 시간 → 답변 시간(자동 녹음) → 모범 답안과 비교
import { useEffect, useRef, useState } from 'react'
import { Furigana } from '../components/Furigana'
import { beep, useAudioPlayer } from '../components/useAudioPlayer'
import type { PartInfo, SjptQuestion } from '../data/sjpt'
import { db, saveRecording, saveSettings } from '../db/db'
import { todayStr } from '../lib/date'
import { plainText } from '../lib/furigana'
import { micErrorMessage, startRecording, type Recording } from '../lib/recorder'
import { speakJapanese, stopSpeaking } from '../lib/speech'

type Phase = 'listen' | 'prep' | 'answer' | 'saving' | 'review' | 'done'

export function SjptPractice({
  part,
  questions,
  rate,
  showText,
  onExit,
  onAgain,
}: {
  part: PartInfo
  questions: SjptQuestion[]
  rate: number
  showText: boolean
  onExit: () => void
  onAgain: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('listen')
  const [endsAt, setEndsAt] = useState(0)
  const [now, setNow] = useState(0)
  const [micError, setMicError] = useState('')
  const [recIds, setRecIds] = useState<Record<string, number>>({})
  const recRef = useRef<Recording | null>(null)
  const listenToken = useRef(0) // '다시 듣기'로 이전 읽기가 취소돼도 엉뚱하게 넘어가지 않게
  const busy = useRef(false)
  const player = useAudioPlayer()

  const q = questions[idx]
  const last = idx === questions.length - 1

  // ── 단계 전환 ──
  function listen() {
    const token = ++listenToken.current
    player.stop()
    setPhase('listen')
    speakJapanese(plainText(q.ja), rate, () => {
      if (token === listenToken.current) startPrep()
    })
  }

  function startPrep() {
    listenToken.current++
    stopSpeaking()
    if (part.prepSec === 0) return void startAnswer()
    setPhase('prep')
    setEndsAt(Date.now() + part.prepSec * 1000)
    setNow(Date.now())
  }

  async function startAnswer() {
    listenToken.current++
    stopSpeaking()
    setPhase('answer')
    setEndsAt(Date.now() + part.answerSec * 1000)
    setNow(Date.now())
    await beep()
    try {
      recRef.current = await startRecording()
      setMicError('')
    } catch (err) {
      recRef.current = null
      setMicError(micErrorMessage(err)) // 녹음이 안 돼도 타이머 연습은 계속
    }
  }

  async function finishAnswer() {
    if (busy.current) return
    busy.current = true
    setPhase('saving')
    const r = recRef.current
    recRef.current = null
    if (r) {
      const { blob, mime, durationMs } = await r.stop()
      if (durationMs > 800) {
        const id = await saveRecording({
          key: `sjpt:${q.id}`,
          date: todayStr(),
          createdAt: Date.now(),
          blob,
          mime,
          durationMs,
        })
        setRecIds((m) => ({ ...m, [q.id]: id }))
      }
    }
    busy.current = false
    setPhase('review')
  }

  function next() {
    player.stop()
    if (last) return setPhase('done')
    setIdx(idx + 1)
  }

  // 문제가 바뀌면 질문부터 다시
  useEffect(() => {
    if (idx < questions.length) listen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  // 준비·답변 시간 흐르기
  useEffect(() => {
    if (phase !== 'prep' && phase !== 'answer') return
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (n >= endsAt) {
        clearInterval(t)
        if (phase === 'prep') void startAnswer()
        else void finishAnswer()
      }
    }, 200)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, endsAt])

  // 나가면 녹음·읽기 정리
  useEffect(
    () => () => {
      listenToken.current++
      recRef.current?.cancel()
      stopSpeaking()
    },
    [],
  )

  async function playMine(qid: string) {
    const id = recIds[qid]
    const row = id ? await db.recordings.get(id) : undefined
    if (row) await player.toggle(qid, row.blob)
  }

  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const total = phase === 'prep' ? part.prepSec : part.answerSec
  const header = (
    <div className="study-top">
      <button className="icon" onClick={onExit} aria-label="그만하기">
        ✕
      </button>
      <div className="progress thin">
        <div style={{ width: `${((idx + (phase === 'review' || phase === 'done' ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>
      <span className="tiny">
        {Math.min(idx + 1, questions.length)}/{questions.length}
      </span>
    </div>
  )

  if (phase === 'done') {
    return (
      <div className="sjpt">
        {header}
        <h2 className="center">
          {part.id}부 {part.title} 끝! 👏
        </h2>
        <p className="hint center">내 녹음과 모범 답안을 번갈아 들어 보세요.</p>
        <ul className="sjpt-summary">
          {questions.map((qq) => (
            <li key={qq.id}>
              <div className="example-ja">
                <Furigana text={qq.ja} />
              </div>
              <div className="row">
                <button className="listen" disabled={!recIds[qq.id]} onClick={() => playMine(qq.id)}>
                  {player.playing === qq.id ? '⏸ 내 답' : '▶ 내 답'}
                </button>
                <button className="listen" onClick={() => speakJapanese(plainText(qq.answer), rate)}>
                  🔊 모범 답
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button className="primary" onClick={onAgain}>
          새 문제로 한 번 더
        </button>
        <button className="secondary" onClick={onExit}>
          목록으로
        </button>
      </div>
    )
  }

  const questionBox = (
    <div className="sjpt-q">
      {showText || phase === 'review' ? (
        <>
          <div className="example-ja">
            <Furigana text={q.ja} />
          </div>
          <div className="tiny">{q.ko}</div>
        </>
      ) : (
        <div className="hint">🎧 질문을 잘 들어 보세요</div>
      )}
    </div>
  )

  return (
    <div className="sjpt">
      {header}
      <p className="sjpt-part">
        {part.id}부 {part.ja} · 준비 {part.prepSec}초 · 답변 {part.answerSec}초
      </p>
      {questionBox}

      {phase === 'listen' && (
        <div className="sjpt-stage">
          <div className="sjpt-big">🎧 듣는 중…</div>
          <div className="row">
            <button className="secondary" onClick={listen}>
              🔁 다시 듣기
            </button>
            <button className="secondary" onClick={startPrep}>
              바로 시작 ▶
            </button>
          </div>
        </div>
      )}

      {(phase === 'prep' || phase === 'answer') && (
        <div className={`sjpt-stage ${phase}`}>
          <div className="sjpt-big">
            {phase === 'prep' ? '💭 생각할 시간' : '🔴 말하세요'} <b>{left}</b>초
          </div>
          <div className="progress">
            <div style={{ width: `${total ? (left / total) * 100 : 0}%` }} />
          </div>
          {phase === 'prep' ? (
            <button className="secondary" onClick={() => void startAnswer()}>
              바로 말하기
            </button>
          ) : (
            <button className="primary" onClick={() => void finishAnswer()}>
              다 말했어요
            </button>
          )}
          {micError && <p className="warn">{micError} (녹음 없이 시간만 연습해요)</p>}
        </div>
      )}

      {phase === 'saving' && <div className="sjpt-stage sjpt-big">저장 중…</div>}

      {phase === 'review' && (
        <div className="sjpt-stage">
          <div className="row">
            <button className="secondary" disabled={!recIds[q.id]} onClick={() => playMine(q.id)}>
              {player.playing === q.id ? '⏸ 내 답 멈춤' : '▶ 내 답 듣기'}
            </button>
            <button className="secondary" onClick={() => speakJapanese(plainText(q.answer), rate)}>
              🔊 모범 답
            </button>
          </div>
          <div className="example sjpt-model">
            <span className="tiny">모범 답안</span>
            <div className="example-ja">
              <Furigana text={q.answer} />
            </div>
            <div className="ko">{q.answerKo}</div>
            {q.tip && (
              <div className="tiny">
                💡 <Furigana text={q.tip} />
              </div>
            )}
          </div>
          <div className="row">
            <button className="secondary" onClick={listen}>
              다시 답하기
            </button>
            <button className="primary" onClick={next}>
              {last ? '결과 보기' : '다음 문제 →'}
            </button>
          </div>
        </div>
      )}

      <label className="toggle sjpt-toggle">
        <input
          type="checkbox"
          checked={showText}
          onChange={(e) => void saveSettings({ speakShowText: e.target.checked })}
        />
        질문 글자 보기 (끄면 실제 시험처럼 듣기만)
      </label>
    </div>
  )
}
