// 브라우저 내장 음성 합성(TTS)으로 일본어를 읽어줍니다. 무료, 오프라인에서도 기기에 음성 데이터가 있으면 동작.

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.startsWith('ja'))
}

export function hasJapaneseVoice(): boolean {
  return isTtsSupported() && pickJapaneseVoice() !== undefined
}

/** onEnd: 다 읽었을 때(또는 읽기 실패·취소 시) 한 번 불려요. */
export function speakJapanese(text: string, rate = 0.9, onEnd?: () => void): void {
  if (!isTtsSupported()) {
    onEnd?.()
    return
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  const voice = pickJapaneseVoice()
  if (voice) u.voice = voice
  if (onEnd) {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        onEnd()
      }
    }
    u.onend = finish
    u.onerror = finish
  }
  window.speechSynthesis.speak(u)
}

export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel()
}
