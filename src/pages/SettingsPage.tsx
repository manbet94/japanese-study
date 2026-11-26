import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings, type Direction, type Settings } from '../db/db'
import { exportBackup, importBackup } from '../lib/backup'
import { hasJapaneseVoice, speakJapanese } from '../lib/speech'

function Chips<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={String(o.value)} className={`chip ${o.value === value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPage() {
  const settings = useLiveQuery(getSettings, [])
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  if (!settings) return null
  const set = (patch: Partial<Settings>) => saveSettings(patch)

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('지금 기록을 백업 파일의 내용으로 바꿉니다. 계속할까요?')) return
    try {
      const r = await importBackup(file)
      setMessage(`복원 완료: 단어 ${r.cards}개, 기록 ${r.logs}일`)
    } catch (err) {
      setMessage(`복원 실패: ${(err as Error).message}`)
    }
  }

  return (
    <>
      <header>
        <h1>설정</h1>
      </header>

      <section className="card">
        <h2>하루 새 단어 수</h2>
        <Chips
          value={settings.newPerDay}
          options={[3, 5, 10, 15].map((n) => ({ value: n, label: `${n}개` }))}
          onChange={(v) => set({ newPerDay: v })}
        />
        <p className="tiny">처음엔 5개를 추천해요. 복습이 쌓이면 하루 시간이 늘어나요.</p>
      </section>

      <section className="card">
        <h2>복습 카드 방향</h2>
        <Chips<Direction>
          value={settings.direction}
          options={[
            { value: 'ja-ko', label: '일본어 → 뜻' },
            { value: 'ko-ja', label: '뜻 → 일본어' },
            { value: 'mix', label: '섞기' },
          ]}
          onChange={(v) => set({ direction: v })}
        />
        <p className="tiny">"뜻 → 일본어"는 한국어를 보고 일본어로 말해 보는 연습이라 말하기에 좋아요. 새 단어는 처음 한 번은 항상 일본어 → 뜻으로 나와요.</p>
      </section>

      <section className="card">
        <h2>후리가나</h2>
        <label className="toggle">
          <input type="checkbox" checked={settings.furigana} onChange={(e) => set({ furigana: e.target.checked })} />
          한자 위에 히라가나 표시
        </label>
        <p className="tiny">한자에 익숙해지면 꺼 보세요. 꺼도 새 단어 소개와 정답 화면에는 항상 표시돼요.</p>
      </section>

      <section className="card">
        <h2>발음</h2>
        <label className="toggle">
          <input type="checkbox" checked={settings.autoPlay} onChange={(e) => set({ autoPlay: e.target.checked })} />
          카드가 나올 때 자동으로 읽어주기
        </label>
        <Chips
          value={settings.rate}
          options={[
            { value: 0.7, label: '느리게' },
            { value: 0.9, label: '보통' },
            { value: 1.0, label: '빠르게' },
          ]}
          onChange={(v) => set({ rate: v })}
        />
        <button className="secondary" onClick={() => speakJapanese('おはようございます。今日もがんばりましょう。', settings.rate)}>
          🔊 속도 들어보기
        </button>
        {!hasJapaneseVoice() && <p className="warn">일본어 음성을 찾지 못했어요. 폰 설정에서 일본어 음성 데이터를 설치해 주세요.</p>}
      </section>

      <section className="card">
        <h2>백업</h2>
        <p className="tiny">
          학습 기록은 이 폰 안에만 저장돼요. 가끔 백업 파일을 저장해 두세요. (Chrome 데이터 삭제 시 기록이 사라져요)
        </p>
        <div className="row">
          <button className="secondary" onClick={() => exportBackup()}>
            백업 파일 저장
          </button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            백업에서 복원
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {message && <p className="ok">{message}</p>}
        {persisted === false && <p className="tiny">※ 저장공간 보호가 아직 꺼져 있어요. 홈 화면 앱으로 자주 쓰면 자동으로 켜져요.</p>}
      </section>

      <button className="secondary" onClick={() => location.reload()}>
        🔄 앱 새로고침 (업데이트가 안 보일 때)
      </button>
      <p className="tiny center">日本語 매일 20분 · v0.1.2</p>
    </>
  )
}
