// 복습 일정: 맞히면 3일 → 7일 → 14일 → 30일 후로 점점 늘어나고, 틀리면 1일 후에 다시.
import { addDays } from './date'

export interface CardState {
  id: string
  interval: number // 이번에 정해진 간격(일)
  reps: number // 연속으로 맞힌 횟수
  lapses: number // 틀린 횟수
  due: string // 다음 복습일 YYYY-MM-DD
  firstSeen: string
  lastReview: string
}

/** 연속으로 맞힌 횟수에 따른 다음 복습까지의 날 수 */
export const CORRECT_STEPS = [3, 7, 14, 30]
export const WRONG_INTERVAL = 1

export function newCard(id: string, today: string): CardState {
  return { id, interval: 0, reps: 0, lapses: 0, due: today, firstSeen: today, lastReview: '' }
}

export function nextInterval(card: CardState, correct: boolean): number {
  if (!correct) return WRONG_INTERVAL
  return CORRECT_STEPS[Math.min(card.reps, CORRECT_STEPS.length - 1)]
}

export function review(card: CardState, correct: boolean, today: string): CardState {
  const interval = nextInterval(card, correct)
  return {
    ...card,
    interval,
    reps: correct ? card.reps + 1 : 0,
    lapses: correct ? card.lapses : card.lapses + 1,
    due: addDays(today, interval),
    lastReview: today,
  }
}

/** 이 정도 간격이면 "외운 단어"로 표시 */
export function isKnown(card: CardState): boolean {
  return card.interval >= 14
}
