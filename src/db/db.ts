// 폰 안의 저장소(IndexedDB). 학습 기록은 이 폰(브라우저)에만 저장됩니다. → 설정에서 백업 가능
import Dexie, { type EntityTable } from 'dexie'
import type { CardState } from '../lib/srs'

export interface DayLog {
  date: string // YYYY-MM-DD
  reviews: number // 오늘 넘긴 카드 수
  newLearned: number // 오늘 새로 배운 단어 수
  done: boolean // 오늘 단어 학습 완료
}

export type Direction = 'ja-ko' | 'ko-ja' | 'mix'

export interface Settings {
  newPerDay: number
  direction: Direction
  autoPlay: boolean
  rate: number
}

export const defaultSettings: Settings = {
  newPerDay: 5,
  direction: 'ja-ko',
  autoPlay: true,
  rate: 0.9,
}

interface KvRow {
  key: string
  value: unknown
}

export const db = new Dexie('japanese-study') as Dexie & {
  cards: EntityTable<CardState, 'id'>
  logs: EntityTable<DayLog, 'date'>
  kv: EntityTable<KvRow, 'key'>
}

db.version(1).stores({
  cards: 'id, due',
  logs: 'date',
  kv: 'key',
})

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...defaultSettings, ...(row?.value as Partial<Settings> | undefined) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.kv.put({ key: 'settings', value: { ...current, ...patch } })
}

export async function bumpLog(
  date: string,
  change: { reviews?: number; newLearned?: number; done?: boolean },
): Promise<void> {
  await db.transaction('rw', db.logs, async () => {
    const log = (await db.logs.get(date)) ?? { date, reviews: 0, newLearned: 0, done: false }
    await db.logs.put({
      date,
      reviews: log.reviews + (change.reviews ?? 0),
      newLearned: log.newLearned + (change.newLearned ?? 0),
      done: change.done ?? log.done,
    })
  })
}
