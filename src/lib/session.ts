// 공부할 카드 목록 만들기
// - 복습: 복습일이 된 단어 전부
// - 새 단어: 한 세트(5개, 10개 …)씩. 하루에 몇 세트든 원하는 만큼
import { allWords, wordById, type Word } from '../data/vocab'
import { db, type Direction, type Settings } from '../db/db'
import { newCard, type CardState } from './srs'

export type StudyMode = 'review' | 'new'

/** 새 단어 소개 카드 */
export interface IntroItem {
  kind: 'intro'
  word: Word
}

/** 3지선다 문제 카드 */
export interface QuizItem {
  kind: 'quiz'
  word: Word
  card: CardState
  isNew: boolean
  front: 'ja' | 'ko' // ja: 일본어 보고 뜻 고르기, ko: 뜻 보고 일본어 고르기
  choices: Word[]
  retry: boolean // 틀린 문제를 학습 끝에 한 번 더 (일정에는 영향 없음)
}

export type QueueItem = IntroItem | QuizItem

export interface TodayCounts {
  due: number // 오늘 복습할 단어
  nextSet: number // 다음 새 단어 세트 크기 (남은 단어가 적으면 줄어듦)
  unseen: number // 아직 안 배운 단어 전체
}

export function shuffle<T>(arr: T[]): T[] {
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

/** 정답 1개 + 오답 2개. 오답은 가능하면 같은 급수에서, 뜻·단어가 겹치지 않게 */
export function makeChoices(word: Word, pool: Word[] = allWords): Word[] {
  const ok = (w: Word) => w.id !== word.id && w.meaning !== word.meaning && w.word !== word.word
  const same = shuffle(pool.filter((w) => ok(w) && w.level === word.level))
  const other = shuffle(pool.filter((w) => ok(w) && w.level !== word.level))
  return shuffle([word, ...[...same, ...other].slice(0, 2)])
}

export function quizItem(word: Word, card: CardState, isNew: boolean, front: 'ja' | 'ko', retry = false): QuizItem {
  return { kind: 'quiz', word, card, isNew, front, choices: makeChoices(word), retry }
}

async function unseenWords(): Promise<Word[]> {
  const seen = new Set(await db.cards.toCollection().primaryKeys())
  return allWords.filter((w) => !seen.has(w.id))
}

async function dueCards(today: string): Promise<CardState[]> {
  const cards = await db.cards.where('due').belowOrEqual(today).toArray()
  return cards.filter((c) => wordById.has(c.id))
}

export async function getTodayCounts(today: string, settings: Settings): Promise<TodayCounts> {
  const [due, unseen] = await Promise.all([dueCards(today), unseenWords()])
  return { due: due.length, nextSet: Math.min(settings.setSize, unseen.length), unseen: unseen.length }
}

export async function buildQueue(today: string, settings: Settings, mode: StudyMode): Promise<QueueItem[]> {
  if (mode === 'review') {
    const due = shuffle(await dueCards(today))
    return due.map((card) => quizItem(wordById.get(card.id)!, card, false, pickFront(settings.direction)))
  }
  // 새 단어 한 세트: 먼저 소개 카드로 보여주고, 다 본 뒤에 문제로 확인 (처음엔 일본어 → 뜻)
  const fresh = (await unseenWords()).slice(0, settings.setSize)
  const intros: IntroItem[] = fresh.map((word) => ({ kind: 'intro', word }))
  const quizzes = shuffle(fresh).map((word) => quizItem(word, newCard(word.id, today), true, 'ja'))
  return [...intros, ...quizzes]
}
