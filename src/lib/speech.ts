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

export function speakJapanese(text: string, rate = 0.9): void {
  if (!isTtsSupported()) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ja-JP'
  u.rate = rate
  const voice = pickJapaneseVoice()
  if (voice) u.voice = voice
  window.speechSynthesis.speak(u)
}
