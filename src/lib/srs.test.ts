import { describe, expect, it } from 'vitest'
import { allWords } from '../data/vocab'
import { addDays, diffDays } from './date'
import { newCard, review } from './srs'
import { calcStreak } from './streak'

const T = '2026-11-26'

describe('srs', () => {
  it('새 카드: 알맞음 → 1일, 다시 알맞음 → 3일, 그다음은 ease 배로 늘어남', () => {
    let c = review(newCard('x', T), 'good', T)
    expect(c.interval).toBe(1)
    expect(c.due).toBe('2026-11-27')
    c = review(c, 'good', c.due)
    expect(c.interval).toBe(3)
    c = review(c, 'good', c.due)
    expect(c.interval).toBe(Math.round(3 * 2.5))
    expect(c.reps).toBe(3)
  })

  it('다시: 오늘 다시 보고, 연속 기록 초기화, 잊은 횟수 증가', () => {
    let c = review(newCard('x', T), 'good', T)
    c = review(c, 'again', '2026-11-27')
    expect(c.interval).toBe(0)
    expect(c.due).toBe('2026-11-27')
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(1)
    expect(c.ease).toBeCloseTo(2.3)
  })

  it('처음 보는 카드에서 다시를 눌러도 잊은 횟수는 늘지 않음', () => {
    expect(review(newCard('x', T), 'again', T).lapses).toBe(0)
  })

  it('쉬움은 알맞음보다 간격이 길고, ease는 1.3 아래로 안 내려감', () => {
    const base = review(review(newCard('x', T), 'good', T), 'good', T)
    expect(review(base, 'easy', T).interval).toBeGreaterThan(review(base, 'good', T).interval)
    let c = newCard('y', T)
    for (let i = 0; i < 10; i++) c = review(c, 'again', T)
    expect(c.ease).toBe(1.3)
  })
})

describe('date', () => {
  it('월말/연말을 넘어가는 날짜 계산', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-11-26', '2026-12-03')).toBe(7)
  })
})

describe('streak', () => {
  it('오늘 안 했어도 어제까지 이어졌으면 유지', () => {
    const done = new Set(['2026-11-23', '2026-11-24', '2026-11-25'])
    expect(calcStreak(done, T)).toBe(3)
    done.add(T)
    expect(calcStreak(done, T)).toBe(4)
    expect(calcStreak(new Set(['2026-11-20']), T)).toBe(0)
  })
})

describe('vocab data', () => {
  it('단어 id가 겹치지 않고 빈 칸이 없음', () => {
    const ids = allWords.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const w of allWords) {
      for (const v of [w.word, w.reading, w.meaning, w.example, w.exampleKo]) expect(v.trim()).not.toBe('')
    }
  })
})
