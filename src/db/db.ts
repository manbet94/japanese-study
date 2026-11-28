// 폰 안의 저장소(IndexedDB). 학습 기록은 이 폰(브라우저)에만 저장됩니다. → 설정에서 백업 가능
import Dexie, { type EntityTable } from 'dexie'
import type { PosFilter } from '../data/vocab'
import type { CardState } from '../lib/srs'

export interface DayLog {
  date: string // YYYY-MM-DD
  reviews: number // 오늘 넘긴 카드 수
  newLearned: number // 오늘 새로 배운 단어 수
  done: boolean // 오늘 단어 학습 완료
}

export type Direction = 'ja-ko' | 'ko-ja' | 'mix'

export interface Settings {
  setSize: number // 새 단어 한 세트의 개수 (하루에 몇 세트든 자유롭게)
  direction: Direction
  autoPlay: boolean
  rate: number
  furigana: boolean // 한자 위에 히라가나 표시
  newPos: PosFilter // 새 단어를 어떤 품사에서 배울지 ('all'이면 골고루 섞어서)
}

export const defaultSettings: Settings = {
  setSize: 5,
  direction: 'ja-ko',
  autoPlay: true,
  rate: 0.9,
  furigana: true,
  newPos: 'all',
}

interface KvRow {
  key: string
  value: unknown
}

/** 문제 하나를 푼 기록 (날짜별 학습 내용 보기용) */
export interface HistoryRow {
  id?: number
  date: string
  wordId: string
  correct: boolean
  isNew: boolean
}

export const db = new Dexie('japanese-study') as Dexie & {
  cards: EntityTable<CardState, 'id'>
  logs: EntityTable<DayLog, 'date'>
  kv: EntityTable<KvRow, 'key'>
  history: EntityTable<HistoryRow, 'id'>
}

db.version(1).stores({
  cards: 'id, due',
  logs: 'date',
  kv: 'key',
})

// v2: 문제별 기록 추가 (기존 데이터는 그대로 유지)
db.version(2).stores({
  cards: 'id, due, firstSeen',
  history: '++id, date',
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
