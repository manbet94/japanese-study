// 브라우저 내장 녹음(MediaRecorder). 무료이고 녹음 파일은 폰 안에만 저장돼요.

export interface Recorded {
  blob: Blob
  mime: string
  durationMs: number
}

export interface Recording {
  stop: () => Promise<Recorded>
  cancel: () => void
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

function pickMime(): string {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

/** 녹음 시작. 마이크 권한을 처음 물어볼 때 사용자가 거절하면 에러가 나요. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: Blob[] = []
  const startedAt = Date.now()
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }
  const release = () => stream.getTracks().forEach((t) => t.stop())
  rec.start()

  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          release()
          const type = rec.mimeType || mime || 'audio/webm'
          resolve({ blob: new Blob(chunks, { type }), mime: type, durationMs: Date.now() - startedAt })
        }
        rec.stop()
      }),
    cancel: () => {
      rec.onstop = release
      if (rec.state !== 'inactive') rec.stop()
      else release()
    },
  }
}

/** 마이크 에러를 한국어 안내로 */
export function micErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return '마이크 권한이 꺼져 있어요. 주소창 왼쪽 아이콘(또는 Chrome 설정 → 사이트 설정 → 마이크)에서 허용해 주세요.'
  if (name === 'NotFoundError') return '마이크를 찾지 못했어요.'
  return '녹음을 시작하지 못했어요. 앱을 다시 열어 보세요.'
}
