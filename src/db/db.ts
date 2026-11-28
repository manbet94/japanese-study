// 폰 안의 저장소(IndexedDB). 학습 기록은 이 폰(브라우저)에만 저장됩니다. → 설정에서 백업 가능
import Dexie, { type EntityTable } from 'dexie'
import type { PosFilter } from '../data/vocab'
import { defaultProfile, type Profile } from '../lib/intro'
import type { CardState } from '../lib/srs'

export interface DayLog {
  date: string // YYYY-MM-DD
  reviews: number // 오늘 넘긴 카드 수
  newLearned: number // 오늘 새로 배운 단어 수
  done: boolean // 오늘 단어 학습 완료
  speaking?: number // 오늘 말하기 녹음 횟수 (v0.2.0부터)
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

/** 말하기 녹음 한 개. 용량이 커서 백업 파일에는 넣지 않고, 연습마다 최근 몇 개만 남겨요. */
export interface RecordingRow {
  id?: number
  key: string // 무엇을 연습한 녹음인지 (예: 'intro')
  date: string
  createdAt: number
  blob: Blob
  mime: string
  durationMs: number
}

export const KEEP_RECORDINGS = 5

export const db = new Dexie('japanese-study') as Dexie & {
  cards: EntityTable<CardState, 'id'>
  logs: EntityTable<DayLog, 'date'>
  kv: EntityTable<KvRow, 'key'>
  history: EntityTable<HistoryRow, 'id'>
  recordings: EntityTable<RecordingRow, 'id'>
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

// v3: 말하기 녹음 추가 (기존 데이터는 그대로 유지)
db.version(3).stores({
  recordings: '++id, key, createdAt',
})

export async function getProfile(): Promise<Profile | null> {
  const row = await db.kv.get('profile')
  return row ? { ...defaultProfile, ...(row.value as Partial<Profile>) } : null
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.kv.put({ key: 'profile', value: profile })
}

/** 녹음을 저장하고, 같은 연습의 오래된 녹음은 최근 KEEP_RECORDINGS개만 남기고 지워요. */
export async function saveRecording(rec: Omit<RecordingRow, 'id'>): Promise<void> {
  await db.transaction('rw', db.recordings, async () => {
    await db.recordings.add(rec)
    const all = await db.recordings.where('key').equals(rec.key).sortBy('createdAt')
    const old = all.slice(0, Math.max(0, all.length - KEEP_RECORDINGS))
    await db.recordings.bulkDelete(old.map((r) => r.id!))
  })
  await bumpLog(rec.date, { speaking: 1 })
}

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
  change: { reviews?: number; newLearned?: number; done?: boolean; speaking?: number },
): Promise<void> {
  await db.transaction('rw', db.logs, async () => {
    const log: DayLog = (await db.logs.get(date)) ?? { date, reviews: 0, newLearned: 0, done: false }
    await db.logs.put({
      date,
      reviews: log.reviews + (change.reviews ?? 0),
      newLearned: log.newLearned + (change.newLearned ?? 0),
      done: change.done ?? log.done,
      speaking: (log.speaking ?? 0) + (change.speaking ?? 0),
    })
  })
}
