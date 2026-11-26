// 오늘 공부할 카드 목록 만들기: 복습할 카드(복습일이 된 것) + 새 단어
import { allWords, wordById, type Word } from '../data/vocab'
import { db, type Direction, type Settings } from '../db/db'
import { newCard, type CardState } from './srs'

export interface QueueItem {
  word: Word
  card: CardState
  isNew: boolean
  front: 'ja' | 'ko' // 앞면에 보여줄 언어
}

export interface TodayCounts {
  due: number
  newLeft: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickFront(direction: Direction): 'ja' | 'ko' {
  if (direction === 'mix') return Math.random() < 0.5 ? 'ja' : 'ko'
  return direction === 'ja-ko' ? 'ja' : 'ko'
}

async function newWordsLeft(today: string, settings: Settings): Promise<Word[]> {
  const log = await db.logs.get(today)
  const left = Math.max(0, settings.newPerDay - (log?.newLearned ?? 0))
  if (left === 0) return []
  const seen = new Set(await db.cards.toCollection().primaryKeys())
  return allWords.filter((w) => !seen.has(w.id)).slice(0, left)
}

async function dueCards(today: string): Promise<CardState[]> {
  const cards = await db.cards.where('due').belowOrEqual(today).toArray()
  return cards.filter((c) => wordById.has(c.id))
}

export async function getTodayCounts(today: string, settings: Settings): Promise<TodayCounts> {
  const [due, fresh] = await Promise.all([dueCards(today), newWordsLeft(today, settings)])
  return { due: due.length, newLeft: fresh.length }
}

export async function buildQueue(today: string, settings: Settings): Promise<QueueItem[]> {
  const [due, fresh] = await Promise.all([dueCards(today), newWordsLeft(today, settings)])
  const reviews: QueueItem[] = shuffle(due).map((card) => ({
    word: wordById.get(card.id)!,
    card,
    isNew: false,
    front: pickFront(settings.direction),
  }))
  // 새 단어는 처음 볼 때 일본어 → 한국어로 보여줘서 익히게 합니다.
  const news: QueueItem[] = fresh.map((word) => ({
    word,
    card: newCard(word.id, today),
    isNew: true,
    front: 'ja',
  }))
  return [...reviews, ...news]
}
