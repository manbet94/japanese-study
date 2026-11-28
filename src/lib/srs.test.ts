import { describe, expect, it } from 'vitest'
import { allWords, posGroup } from '../data/vocab'
import { addDays, diffDays } from './date'
import { hasKanji, kanaText, parseFurigana, plainText, wordSegments } from './furigana'
import { makeChoices, meaningKeys, newWordOrder } from './session'
import { newCard, review } from './srs'
import { calcStreak } from './streak'

const T = '2026-11-26'

describe('복습 일정', () => {
  it('맞히면 3일 → 7일 → 14일 → 30일 → 30일', () => {
    let c = newCard('x', T)
    const got: number[] = []
    for (let i = 0; i < 5; i++) {
      c = review(c, true, c.due)
      got.push(c.interval)
    }
    expect(got).toEqual([3, 7, 14, 30, 30])
    expect(review(newCard('x', T), true, T).due).toBe('2026-11-29')
  })

  it('틀리면 1일 후, 연속 기록은 처음부터', () => {
    let c = review(review(newCard('x', T), true, T), true, T) // 7일 단계
    c = review(c, false, T)
    expect(c.interval).toBe(1)
    expect(c.due).toBe('2026-11-27')
    expect(c.reps).toBe(0)
    expect(c.lapses).toBe(1)
    expect(review(c, true, c.due).interval).toBe(3)
  })
})

describe('후리가나', () => {
  it('예문 표기 해석', () => {
    const s = '会社{かいしゃ}へ行{い}きます。'
    expect(plainText(s)).toBe('会社へ行きます。')
    expect(kanaText(s)).toBe('かいしゃへいきます。')
    expect(parseFurigana(s)).toEqual([
      { text: '会社', ruby: 'かいしゃ' },
      { text: 'へ' },
      { text: '行', ruby: 'い' },
      { text: 'きます。' },
    ])
  })

  it('단어는 한자 부분에만 읽기', () => {
    expect(wordSegments('大きい', 'おおきい')).toEqual([{ text: '大', ruby: 'おお' }, { text: 'きい' }])
    expect(wordSegments('お茶', 'おちゃ')).toEqual([{ text: 'お' }, { text: '茶', ruby: 'ちゃ' }])
    expect(wordSegments('勉強する', 'べんきょうする')).toEqual([{ text: '勉強', ruby: 'べんきょう' }, { text: 'する' }])
    expect(wordSegments('バス', 'バス')).toEqual([{ text: 'バス' }])
  })
})

describe('3지선다', () => {
  it('정답 1개 + 서로 다른 오답 2개', () => {
    for (const w of allWords.slice(0, 30)) {
      const choices = makeChoices(w)
      expect(choices).toHaveLength(3)
      expect(choices.filter((c) => c.id === w.id)).toHaveLength(1)
      expect(new Set(choices.map((c) => c.meaning)).size).toBe(3)
    }
  })

  it('모든 단어: 뜻이 겹치는 오답이 없고, 오답은 같은 품사', () => {
    for (const w of allWords) {
      const keys = new Set(meaningKeys(w.meaning))
      const wrong = makeChoices(w).filter((c) => c.id !== w.id)
      expect(wrong).toHaveLength(2)
      for (const c of wrong) {
        expect(meaningKeys(c.meaning).some((k) => keys.has(k)), `${w.word} ↔ ${c.word}`).toBe(false)
        expect(posGroup(c.pos), `${w.word} ↔ ${c.word}`).toBe(posGroup(w.pos))
      }
    }
  })

  it('뜻 핵심어 뽑기', () => {
    expect(meaningKeys('(옷을) 입다')).toEqual(['입'])
    expect(meaningKeys('위험하다')).toEqual(meaningKeys('위험함'))
  })
})

describe('새 단어 순서', () => {
  it('전체: 단어가 빠짐없이, N5 먼저, 첫 세트에 여러 품사가 섞임', () => {
    const order = newWordOrder(allWords, 'all')
    expect(new Set(order.map((w) => w.id)).size).toBe(allWords.length)
    const firstN4 = order.findIndex((w) => w.level === 'N4')
    expect(order.slice(firstN4).every((w) => w.level === 'N4')).toBe(true)
    expect(new Set(order.slice(0, 10).map((w) => posGroup(w.pos))).size).toBeGreaterThanOrEqual(3)
  })

  it('품사를 고르면 그 품사만, 원래 순서대로', () => {
    const verbs = newWordOrder(allWords, 'verb')
    expect(verbs.length).toBeGreaterThan(0)
    expect(verbs.every((w) => w.pos === 'verb')).toBe(true)
    expect(verbs).toEqual(allWords.filter((w) => w.pos === 'verb'))
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

describe('단어 데이터', () => {
  it('id가 겹치지 않고 빈 칸이 없음', () => {
    const ids = allWords.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const w of allWords) {
      for (const v of [w.word, w.reading, w.meaning, w.example, w.exampleKo]) expect(v.trim()).not.toBe('')
    }
  })

  it('예문의 모든 한자에 읽기가 붙어 있음', () => {
    const missing = allWords.filter((w) => {
      const outside = parseFurigana(w.example)
        .filter((s) => !s.ruby)
        .map((s) => s.text)
        .join('')
      return hasKanji(outside)
    })
    expect(missing.map((w) => w.example)).toEqual([])
  })

  it('같은 단어가 N5와 N4에 겹쳐 들어가지 않음', () => {
    const n5 = new Set(allWords.filter((w) => w.level === 'N5').map((w) => w.word))
    expect(allWords.filter((w) => w.level === 'N4' && n5.has(w.word)).map((w) => w.word)).toEqual([])
  })

  it('읽기 칸은 히라가나/가타카나만', () => {
    const bad = allWords.filter((w) => hasKanji(w.reading))
    expect(bad.map((w) => w.word)).toEqual([])
  })
})
