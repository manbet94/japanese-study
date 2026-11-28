// 공부할 카드 목록 만들기
// - 복습: 복습일이 된 단어 전부
// - 새 단어: 한 세트(5개, 10개 …)씩. 하루에 몇 세트든 원하는 만큼
import { allWords, LEVELS, matchPos, POS_FILTERS, posGroup, wordById, type PosFilter, type Word } from '../data/vocab'
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
  nextSet: number // 다음 새 단어 세트 크기 (고른 품사에서 남은 단어가 적으면 줄어듦)
  unseen: number // 아직 안 배운 단어 전체
  unseenByPos: Record<PosFilter, number> // 품사별로 아직 안 배운 단어
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

/** 뜻을 비교용 핵심어로: '(옷을) 입다, 걸치다' → ['입', '걸치'] */
export function meaningKeys(meaning: string): string[] {
  return meaning
    .replace(/\([^)]*\)/g, '')
    .split(',')
    .map((s) => s.trim().replace(/(하다|함|임|다)$/, ''))
    .filter(Boolean)
}

/**
 * 정답 1개 + 오답 2개.
 * 오답은 같은 품사·같은 급수를 먼저 골라서(헷갈려야 공부가 됨),
 * 뜻이 겹치는 단어(思う/考える처럼 둘 다 정답처럼 보이는 것)는 빼요.
 */
export function makeChoices(word: Word, pool: Word[] = allWords): Word[] {
  const keys = new Set(meaningKeys(word.meaning))
  const ok = (w: Word) =>
    w.id !== word.id && w.word !== word.word && !meaningKeys(w.meaning).some((k) => keys.has(k))
  const g = posGroup(word.pos)
  const tiers = [
    (w: Word) => posGroup(w.pos) === g && w.level === word.level,
    (w: Word) => posGroup(w.pos) === g && w.level !== word.level,
    (w: Word) => posGroup(w.pos) !== g && w.level === word.level,
    (w: Word) => posGroup(w.pos) !== g && w.level !== word.level,
  ]
  const candidates = pool.filter(ok)
  const wrong = tiers.flatMap((t) => shuffle(candidates.filter(t))).slice(0, 2)
  return shuffle([word, ...wrong])
}

/**
 * '전체'로 새 단어를 배울 때 한 세트에 품사가 골고루 섞이도록 순서를 바꿔요.
 * 급수 순서(N5 → N4)와 품사 안의 순서는 그대로 두고, 품사마다 같은 간격으로 끼워 넣어요.
 */
export function interleaveByPos(words: Word[]): Word[] {
  const out: Word[] = []
  for (const level of LEVELS) {
    const buckets = new Map<string, Word[]>()
    for (const w of words) {
      if (w.level !== level) continue
      const k = posGroup(w.pos)
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(w)
    }
    const placed = [...buckets.values()].flatMap((list, b) =>
      list.map((w, i) => ({ w, at: (i + 0.5) / list.length, b })),
    )
    placed.sort((x, y) => x.at - y.at || x.b - y.b)
    out.push(...placed.map((p) => p.w))
  }
  return out
}

/** 다음에 배울 새 단어 순서 (품사 선택 반영) */
export function newWordOrder(unseen: Word[], pos: PosFilter): Word[] {
  return pos === 'all' ? interleaveByPos(unseen) : unseen.filter((w) => matchPos(w, pos))
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
  const unseenByPos = Object.fromEntries(
    POS_FILTERS.map((f) => [f.id, unseen.filter((w) => matchPos(w, f.id)).length]),
  ) as Record<PosFilter, number>
  return {
    due: due.length,
    nextSet: Math.min(settings.setSize, unseenByPos[settings.newPos]),
    unseen: unseen.length,
    unseenByPos,
  }
}

export async function buildQueue(today: string, settings: Settings, mode: StudyMode): Promise<QueueItem[]> {
  if (mode === 'review') {
    const due = shuffle(await dueCards(today))
    return due.map((card) => quizItem(wordById.get(card.id)!, card, false, pickFront(settings.direction)))
  }
  // 새 단어 한 세트: 먼저 소개 카드로 보여주고, 다 본 뒤에 문제로 확인 (처음엔 일본어 → 뜻)
  const fresh = newWordOrder(await unseenWords(), settings.newPos).slice(0, settings.setSize)
  const intros: IntroItem[] = fresh.map((word) => ({ kind: 'intro', word }))
  const quizzes = shuffle(fresh).map((word) => quizItem(word, newCard(word.id, today), true, 'ja'))
  return [...intros, ...quizzes]
}
