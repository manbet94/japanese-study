// 말하기 탭: SJPT 1부(자기소개) 연습. 내 자기소개 만들기 → 모범 낭독 듣기 → 녹음해서 비교
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Furigana } from '../components/Furigana'
import { db, getProfile, getSettings, KEEP_RECORDINGS, saveProfile, saveRecording, type RecordingRow } from '../db/db'
import { todayStr } from '../lib/date'
import { plainText } from '../lib/furigana'
import {
  buildIntro,
  CITIES,
  defaultProfile,
  FAMILY,
  FIELDS,
  HOBBIES,
  JOBS,
  REASONS,
  SURNAMES,
  type Option,
  type Profile,
} from '../lib/intro'
import { isRecordingSupported, micErrorMessage, startRecording, type Recording } from '../lib/recorder'
import { speakJapanese } from '../lib/speech'

const REC_KEY = 'intro'
const MAX_REC_MS = 3 * 60 * 1000 // 3분이 지나면 자동으로 멈춤

export function Speaking() {
  const data = useLiveQuery(async () => {
    const [profile, settings, recordings] = await Promise.all([
      getProfile(),
      getSettings(),
      db.recordings.where('key').equals(REC_KEY).reverse().sortBy('createdAt'),
    ])
    return { profile, settings, recordings }
  }, [])
  const [editing, setEditing] = useState(false)

  if (!data) return null
  const { profile, settings, recordings } = data

  if (!profile || editing) {
    return (
      <>
        <header>
          <h1>말하기</h1>
          <p className="sub">내 자기소개 만들기 · 고른 만큼 일본어 문장이 돼요</p>
        </header>
        <IntroForm
          initial={profile ?? defaultProfile}
          onSave={async (p) => {
            await saveProfile(p)
            setEditing(false)
          }}
          onCancel={profile ? () => setEditing(false) : undefined}
        />
      </>
    )
  }

  return (
    <>
      <header>
        <h1>말하기</h1>
        <p className="sub">SJPT 1부 · 자기소개 연습</p>
      </header>
      <IntroPractice profile={profile} rate={settings.rate} onEdit={() => setEditing(true)} />
      <Recorder recordings={recordings} />
      <section className="card muted">
        <h2>연습 순서</h2>
        <ol>
          <li>🔊 문장을 하나씩 듣고 따라 말해요.</li>
          <li>"일본어 가리고 말해 보기"를 켜고 한국어만 보고 말해요.</li>
          <li>🔴 녹음한 뒤 모범 낭독과 번갈아 들어 봐요.</li>
        </ol>
      </section>
    </>
  )
}

/* ───────── 자기소개 문장 ───────── */

function IntroPractice({ profile, rate, onEdit }: { profile: Profile; rate: number; onEdit: () => void }) {
  const sentences = buildIntro(profile)
  const [hideJa, setHideJa] = useState(false)
  const [shown, setShown] = useState<Set<number>>(new Set())

  const toggleHide = () => {
    setHideJa((h) => !h)
    setShown(new Set())
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>내 자기소개</h2>
        <button className="listen" onClick={onEdit}>
          ✏️ 고치기
        </button>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={hideJa} onChange={toggleHide} />
        일본어 가리고 말해 보기
      </label>
      <ol className="intro-lines">
        {sentences.map((s, i) => {
          const hidden = hideJa && !shown.has(i)
          return (
            <li key={i}>
              {hidden ? (
                <button className="reveal" onClick={() => setShown(new Set(shown).add(i))}>
                  눌러서 일본어 보기
                </button>
              ) : (
                <div className="example-ja">
                  <Furigana text={s.ja} />
                </div>
              )}
              <div className="intro-ko">
                <span>{s.ko}</span>
                <button className="listen" onClick={() => speakJapanese(plainText(s.ja), rate)}>
                  🔊
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      <button
        className="secondary big"
        onClick={() => speakJapanese(sentences.map((s) => plainText(s.ja)).join(''), rate)}
      >
        🔊 전체 듣기
      </button>
    </section>
  )
}

/* ───────── 녹음 ───────── */

function formatTime(ms: number): string {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function formatWhen(t: number): string {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Recorder({ recordings }: { recordings: RecordingRow[] }) {
  const [rec, setRec] = useState<Recording | null>(null)
  const [startedAt, setStartedAt] = useState(0)
  const [now, setNow] = useState(0)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState<number | null>(null)
  const audioRef = useRef<{ audio: HTMLAudioElement; url: string } | null>(null)
  const recRef = useRef<Recording | null>(null)

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.audio.pause()
      URL.revokeObjectURL(audioRef.current.url)
      audioRef.current = null
    }
    setPlaying(null)
  }

  async function begin() {
    setError('')
    stopAudio()
    window.speechSynthesis?.cancel()
    try {
      const r = await startRecording()
      recRef.current = r
      setRec(r)
      setStartedAt(Date.now())
      setNow(Date.now())
    } catch (err) {
      setError(micErrorMessage(err))
    }
  }

  async function finish() {
    const r = recRef.current
    if (!r) return
    recRef.current = null
    setRec(null)
    const { blob, mime, durationMs } = await r.stop()
    if (durationMs < 800) return // 실수로 누른 아주 짧은 녹음은 버림
    await saveRecording({ key: REC_KEY, date: todayStr(), createdAt: Date.now(), blob, mime, durationMs })
  }

  // 녹음 중 시간 표시 + 3분 지나면 자동 정지
  useEffect(() => {
    if (!rec) return
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() - startedAt > MAX_REC_MS) void finish()
    }, 250)
    return () => clearInterval(t)
  })

  // 다른 탭으로 나가면 녹음·재생 정리
  useEffect(
    () => () => {
      recRef.current?.cancel()
      stopAudio()
    },
    [],
  )

  function play(r: RecordingRow) {
    if (playing === r.id) return stopAudio()
    stopAudio()
    window.speechSynthesis?.cancel()
    const url = URL.createObjectURL(r.blob)
    const audio = new Audio(url)
    audio.onended = stopAudio
    audioRef.current = { audio, url }
    setPlaying(r.id!)
    audio.play().catch(() => {
      stopAudio()
      setError('재생하지 못했어요.')
    })
  }

  async function remove(r: RecordingRow) {
    if (!confirm('이 녹음을 지울까요?')) return
    if (playing === r.id) stopAudio()
    await db.recordings.delete(r.id!)
  }

  if (!isRecordingSupported()) {
    return (
      <section className="card">
        <h2>🎙️ 녹음</h2>
        <p className="warn">이 브라우저에서는 녹음을 쓸 수 없어요. Chrome으로 열어 주세요.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>🎙️ 녹음해서 비교하기</h2>
      {rec ? (
        <button className="rec-btn on" onClick={finish}>
          <span className="rec-dot" /> 그만하고 저장 · {formatTime(now - startedAt)}
        </button>
      ) : (
        <button className="rec-btn" onClick={begin}>
          🔴 녹음 시작
        </button>
      )}
      {error && <p className="warn">{error}</p>}
      {recordings.length > 0 ? (
        <ul className="rec-list">
          {recordings.map((r) => (
            <li key={r.id}>
              <button className="rec-play" onClick={() => play(r)}>
                {playing === r.id ? '⏸' : '▶'}
              </button>
              <span className="rec-when">{formatWhen(r.createdAt)}</span>
              <span className="rec-len">{formatTime(r.durationMs)}</span>
              <button className="icon" onClick={() => remove(r)} aria-label="녹음 지우기">
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tiny">처음 녹음할 때 "마이크 사용 허용"을 물어보면 허용을 눌러 주세요.</p>
      )}
      <p className="tiny">녹음은 이 폰에만 저장되고, 최근 {KEEP_RECORDINGS}개만 남아요. (백업 파일에는 들어가지 않아요)</p>
    </section>
  )
}

/* ───────── 자기소개 빈칸 채우기 ───────── */

function Pick({
  options,
  value,
  onChange,
}: {
  options: Option[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.id} className={`chip small ${o.id === value ? 'on' : ''}`} onClick={() => onChange(o.id)}>
          {o.ko}
        </button>
      ))}
    </div>
  )
}

function numberOrNull(v: string): number | null {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function IntroForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Profile
  onSave: (p: Profile) => void
  onCancel?: () => void
}) {
  const [p, setP] = useState<Profile>(initial)
  const set = (patch: Partial<Profile>) => setP((cur) => ({ ...cur, ...patch }))
  const toggleFamily = (id: string) =>
    setP((cur) => ({
      ...cur,
      family: cur.family.includes(id) ? cur.family.filter((f) => f !== id) : [...cur.family, id],
    }))

  return (
    <>
      <section className="card form">
        <h2>이름</h2>
        <input
          className="text-in"
          value={p.name}
          placeholder="예: キム"
          onChange={(e) => set({ name: e.target.value })}
        />
        <p className="tiny">일본어(가타카나)로 써요. 성씨를 누르면 바로 들어가요.</p>
        <div className="chips">
          {SURNAMES.map((s) => (
            <button
              key={s.ja}
              className={`chip small ${p.name === s.ja ? 'on' : ''}`}
              onClick={() => set({ name: s.ja })}
            >
              {s.ko} {s.ja}
            </button>
          ))}
        </div>

        <h2>나이 (선택)</h2>
        <input
          className="text-in short"
          inputMode="numeric"
          value={p.age ?? ''}
          placeholder="예: 29"
          onChange={(e) => set({ age: numberOrNull(e.target.value) })}
        />
      </section>

      <section className="card form">
        <h2>사는 곳</h2>
        <Pick options={CITIES} value={p.city} onChange={(city) => set({ city })} />
        <div className="chips">
          <button
            className={`chip small ${p.livesWith === 'family' ? 'on' : ''}`}
            onClick={() => set({ livesWith: 'family' })}
          >
            가족과 살아요
          </button>
          <button
            className={`chip small ${p.livesWith === 'alone' ? 'on' : ''}`}
            onClick={() => set({ livesWith: 'alone' })}
          >
            혼자 살아요
          </button>
        </div>
      </section>

      <section className="card form">
        <h2>직업</h2>
        <Pick options={JOBS} value={p.job} onChange={(job) => set({ job })} />
        {p.job === 'company' && (
          <>
            <h3>하는 일</h3>
            <Pick options={FIELDS} value={p.field} onChange={(field) => set({ field })} />
          </>
        )}
        {p.job !== 'student' && (
          <>
            <h3>{p.job === 'company' ? '입사한 지 몇 년?' : '이 일을 한 지 몇 년?'} (선택)</h3>
            <input
              className="text-in short"
              inputMode="numeric"
              value={p.years ?? ''}
              placeholder="예: 3"
              onChange={(e) => set({ years: numberOrNull(e.target.value) })}
            />
          </>
        )}
      </section>

      <section className="card form">
        <h2>가족 (여러 개 선택)</h2>
        <div className="chips">
          {FAMILY.map((f) => (
            <button
              key={f.id}
              className={`chip small ${p.family.includes(f.id) ? 'on' : ''}`}
              onClick={() => toggleFamily(f.id)}
            >
              {f.ko}
            </button>
          ))}
        </div>
        <p className="tiny">고른 가족 + 나 = 가족 수. 안 고르면 가족 문장은 빠져요.</p>
      </section>

      <section className="card form">
        <h2>취미</h2>
        <Pick options={HOBBIES} value={p.hobby} onChange={(hobby) => set({ hobby })} />
        <h2>일본어를 공부하는 이유</h2>
        <Pick options={REASONS.map((r) => ({ ...r, ko: r.ko.split(' 일본어')[0] }))} value={p.reason} onChange={(reason) => set({ reason })} />
      </section>

      <button className="primary" onClick={() => onSave({ ...p, name: p.name.trim() })}>
        저장하고 연습하기
      </button>
      {onCancel && (
        <button className="secondary" onClick={onCancel}>
          취소
        </button>
      )}
    </>
  )
}
