// 학습 기록 백업/복원 (JSON 파일). 폰을 바꾸거나 브라우저 데이터를 지울 때 대비.
import { db, getSettings, type DayLog, type Settings } from '../db/db'
import type { CardState } from './srs'
import { todayStr } from './date'

interface BackupFile {
  app: 'japanese-study'
  version: 1
  exportedAt: string
  cards: CardState[]
  logs: DayLog[]
  settings: Settings
}

export async function exportBackup(): Promise<void> {
  const data: BackupFile = {
    app: 'japanese-study',
    version: 1,
    exportedAt: new Date().toISOString(),
    cards: await db.cards.toArray(),
    logs: await db.logs.toArray(),
    settings: await getSettings(),
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
  const { cards, logs, settings } = data
  await db.transaction('rw', db.cards, db.logs, db.kv, async () => {
    await db.cards.clear()
    await db.logs.clear()
    await db.cards.bulkPut(cards)
    await db.logs.bulkPut(logs)
    if (settings) await db.kv.put({ key: 'settings', value: settings })
  })
  return { cards: cards.length, logs: logs.length }
}
