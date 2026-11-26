import { addDays } from './date'

// 연속 학습일: 오늘(또는 오늘 아직 안 했으면 어제)부터 거꾸로, 학습을 완료한 날이 며칠 이어지는지.
export function calcStreak(doneDates: Set<string>, today: string): number {
  let d = doneDates.has(today) ? today : addDays(today, -1)
  let n = 0
  while (doneDates.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}
