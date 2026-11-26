// 간격 반복(SRS): Anki에서 쓰는 SM-2 방식을 단순화한 것.
// 잘 기억할수록 다음 복습까지의 간격이 길어지고, 잊어버리면 처음부터 다시 시작합니다.
import { addDays } from './date'

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export interface CardState {
  id: string
  ease: number // 간격이 늘어나는 배율 (1.3 ~ 3.0)
  interval: number // 현재 간격(일)
  reps: number // 연속으로 맞힌 횟수
  lapses: number // 외웠다가 잊어버린 횟수
  due: string // 다음 복습일 YYYY-MM-DD
  firstSeen: string
  lastReview: string
}

const MIN_EASE = 1.3
const MAX_EASE = 3.0

export function newCard(id: string, today: string): CardState {
  return { id, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today, firstSeen: today, lastReview: '' }
}

export function nextInterval(card: CardState, grade: Grade): number {
  const { reps, interval, ease } = card
  switch (grade) {
    case 'again':
      return 0
    case 'hard':
      return reps === 0 ? 1 : Math.max(1, Math.round(interval * 1.2))
    case 'good':
      if (reps === 0) return 1
      if (reps === 1) return 3
      return Math.max(interval + 1, Math.round(interval * ease))
    case 'easy':
      if (reps === 0) return 3
      return Math.max(interval + 2, Math.round(interval * ease * 1.3))
  }
}

export function review(card: CardState, grade: Grade, today: string): CardState {
  const interval = nextInterval(card, grade)
  const easeDelta = { again: -0.2, hard: -0.15, good: 0, easy: 0.15 }[grade]
  const ease = Math.min(MAX_EASE, Math.max(MIN_EASE, card.ease + easeDelta))
  return {
    ...card,
    ease: Math.round(ease * 100) / 100,
    interval,
    reps: grade === 'again' ? 0 : card.reps + 1,
    lapses: grade === 'again' && card.reps > 0 ? card.lapses + 1 : card.lapses,
    due: addDays(today, interval),
    lastReview: today,
  }
}

export function intervalLabel(days: number): string {
  if (days <= 0) return '잠시 후'
  if (days < 30) return `${days}일`
  if (days < 365) return `${Math.round(days / 30)}개월`
  return `${(days / 365).toFixed(1)}년`
}
