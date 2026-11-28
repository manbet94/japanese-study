// 녹음 재생: 한 번에 하나만 재생하고, 같은 버튼을 다시 누르면 멈춰요.
import { useEffect, useRef, useState } from 'react'
import { stopSpeaking } from '../lib/speech'

export function useAudioPlayer() {
  const [playing, setPlaying] = useState<string | number | null>(null)
  const ref = useRef<{ audio: HTMLAudioElement; url: string } | null>(null)

  const stop = () => {
    if (ref.current) {
      ref.current.audio.pause()
      URL.revokeObjectURL(ref.current.url)
      ref.current = null
    }
    setPlaying(null)
  }

  /** 재생에 실패하면 false */
  const toggle = async (key: string | number, blob: Blob): Promise<boolean> => {
    if (playing === key) {
      stop()
      return true
    }
    stop()
    stopSpeaking()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.onended = stop
    ref.current = { audio, url }
    setPlaying(key)
    try {
      await audio.play()
      return true
    } catch {
      stop()
      return false
    }
  }

  useEffect(() => stop, [])

  return { playing, toggle, stop }
}

/** 답변 시작을 알리는 짧은 '삐' 소리 (실제 시험처럼) */
export function beep(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ac = new AudioContext()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.frequency.value = 880
      gain.gain.value = 0.15
      osc.connect(gain).connect(ac.destination)
      osc.start()
      osc.stop(ac.currentTime + 0.18)
      osc.onended = () => {
        void ac.close()
        resolve()
      }
    } catch {
      resolve()
    }
  })
}
