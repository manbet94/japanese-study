// 학습 기록 백업/복원 (JSON 파일). 폰을 바꾸거나 브라우저 데이터를 지울 때 대비.
// 말하기 녹음(recordings)은 용량이 커서 일부러 넣지 않아요.
import { db, getProfile, getSettings, type DayLog, type HistoryRow, type Settings } from '../db/db'
import type { Profile } from './intro'
import type { CardState } from './srs'
import { todayStr } from './date'

interface BackupFile {
  app: 'japanese-study'
  version: 1 | 2 | 3
  exportedAt: string
  cards: CardState[]
  logs: DayLog[]
  history?: HistoryRow[] // version 2부터
  settings: Settings
  profile?: Profile | null // version 3부터 (자기소개 빈칸)
}

export async function exportBackup(): Promise<void> {
  const data: BackupFile = {
    app: 'japanese-study',
    version: 3,
    exportedAt: new Date().toISOString(),
    cards: await db.cards.toArray(),
    logs: await db.logs.toArray(),
    history: await db.history.toArray(),
    settings: await getSettings(),
    profile: await getProfile(),
  }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `japanese-study-backup-${todayStr()}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function importBackup(file: File): Promise<{ cards: number; logs: number }> {
  const data = JSON.parse(await file.text()) as Partial<BackupFile>
  if (data.app !== 'japanese-study' || !Array.isArray(data.cards) || !Array.isArray(data.logs)) {
    throw new Error('이 앱의 백업 파일이 아니에요.')
  }
  const { cards, logs, history, settings, profile } = data
  await db.transaction('rw', [db.cards, db.logs, db.kv, db.history], async () => {
    await db.cards.clear()
    await db.logs.clear()
    await db.history.clear()
    await db.cards.bulkPut(cards)
    await db.logs.bulkPut(logs)
    if (Array.isArray(history)) await db.history.bulkPut(history)
    if (settings) await db.kv.put({ key: 'settings', value: settings })
    if (profile) await db.kv.put({ key: 'profile', value: profile })
  })
  return { cards: cards.length, logs: logs.length }
}
