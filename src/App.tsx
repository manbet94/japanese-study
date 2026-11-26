import { useEffect, useState } from 'react'
import { hasJapaneseVoice, isTtsSupported, speakJapanese } from './lib/speech'

const samples = [
  { ja: 'こんにちは', ko: '안녕하세요' },
  { ja: 'はじめまして。よろしくおねがいします。', ko: '처음 뵙겠습니다. 잘 부탁드립니다.' },
  { ja: 'これはいくらですか。', ko: '이것은 얼마입니까?' },
]

function App() {
  const [voiceReady, setVoiceReady] = useState(hasJapaneseVoice())

  useEffect(() => {
    if (!isTtsSupported()) return
    const update = () => setVoiceReady(hasJapaneseVoice())
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  return (
    <main className="app">
      <header>
        <h1>日本語 매일 20분</h1>
        <p className="sub">목표: SJPT 레벨 5 · v0.0</p>
      </header>

      <section className="card">
        <h2>🔊 발음 테스트</h2>
        <p className="hint">눌러서 일본어 소리가 나오는지 확인해 보세요.</p>
        {samples.map((s) => (
          <button key={s.ja} className="phrase" onClick={() => speakJapanese(s.ja)}>
            <span className="ja" lang="ja">{s.ja}</span>
            <span className="ko">{s.ko}</span>
          </button>
        ))}
        {!isTtsSupported() && <p className="warn">이 브라우저는 음성 읽기를 지원하지 않아요. Chrome을 사용해 주세요.</p>}
        {isTtsSupported() && !voiceReady && (
          <p className="warn">일본어 음성을 찾지 못했어요. 설정 → 일반 → 텍스트 음성 변환에서 일본어 음성 데이터를 설치해 주세요.</p>
        )}
      </section>

      <section className="card muted">
        <h2>다음 단계</h2>
        <ul>
          <li>v0.1 단어 복습 (간격 반복)</li>
          <li>v0.2 SJPT 말하기 연습</li>
        </ul>
      </section>
    </main>
  )
}

export default App
