import { describe, expect, it } from 'vitest'
import { hasKanji, parseFurigana } from './furigana'
import { PART3, PART4, partById, PARTS } from '../data/sjpt'
import {
  buildIntro,
  CITIES,
  defaultProfile,
  FAMILY,
  FIELDS,
  HOBBIES,
  JOBS,
  part1Questions,
  REASONS,
  type Profile,
} from './intro'

const kanjiWithoutReading = (ja: string) =>
  hasKanji(
    parseFurigana(ja)
      .filter((s) => !s.ruby)
      .map((s) => s.text)
      .join(''),
  )

describe('자기소개 만들기', () => {
  it('기본값: 인사로 시작해서 よろしく로 끝남', () => {
    const s = buildIntro(defaultProfile)
    expect(s[0].ja).toBe('はじめまして。')
    expect(s.at(-1)!.ja).toContain('よろしく')
  })

  it('이름·나이·연차·가족을 넣으면 문장으로', () => {
    const p: Profile = { ...defaultProfile, name: 'キム', age: 29, years: 3, family: ['father', 'mother', 'younger-brother'] }
    const ja = buildIntro(p).map((s) => s.ja)
    expect(ja).toContain('はじめまして。キムと申{もう}します。')
    expect(ja).toContain('29歳{さい}です。')
    expect(ja).toContain('入社{にゅうしゃ}して3年{ねん}になります。')
    expect(ja).toContain('家族{かぞく}は四人{よにん}です。父{ちち}と母{はは}と弟{おとうと}と私{わたし}です。')
  })

  it('학생이면 연차 문장을 넣지 않음', () => {
    const ja = buildIntro({ ...defaultProfile, job: 'student', years: 2 }).map((s) => s.ja)
    expect(ja).toContain('大学生{だいがくせい}です。')
    expect(ja.some((s) => s.includes('年{ねん}'))).toBe(false)
  })

  it('어떤 선택지를 골라도 모든 한자에 읽기가 붙어 있음', () => {
    const profiles: Profile[] = [
      ...CITIES.map((c) => ({ ...defaultProfile, city: c.id, livesWith: 'alone' as const })),
      ...JOBS.map((j) => ({ ...defaultProfile, job: j.id, years: 5 })),
      ...FIELDS.map((f) => ({ ...defaultProfile, field: f.id })),
      ...HOBBIES.map((h) => ({ ...defaultProfile, hobby: h.id })),
      ...REASONS.map((r) => ({ ...defaultProfile, reason: r.id })),
      { ...defaultProfile, family: FAMILY.map((f) => f.id), age: 40 },
    ]
    const bad = profiles.flatMap((p) => buildIntro(p)).filter((s) => kanjiWithoutReading(s.ja) || !s.ko.trim())
    expect(bad).toEqual([])
  })
})

describe('SJPT 문제', () => {
  it('1부: 이름을 넣으면 이름 질문이 맨 앞, 고르지 않은 주제는 빠짐', () => {
    const qs = part1Questions({ ...defaultProfile, name: 'キム' })
    expect(qs[0].id).toBe('p1-name')
    expect(qs[0].answer).toBe('キムと申{もう}します。')
    expect(qs.some((q) => q.id === 'p1-family')).toBe(false) // 가족을 안 골랐음
    expect(part1Questions(defaultProfile).some((q) => q.id === 'p1-name')).toBe(false)
  })

  it('부별 정보: 7개 부, 총 26문항', () => {
    expect(PARTS).toHaveLength(7)
    expect(PARTS.reduce((n, p) => n + p.count, 0)).toBe(26)
  })

  it('모든 문제·답·팁: 한자에 읽기, 빈칸 없음, id 겹치지 않음', () => {
    const all = [...PART3, ...PART4, ...part1Questions({ ...defaultProfile, name: 'キム', family: ['mother'], years: 2 })]
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length)
    const texts = [...all.flatMap((q) => [q.ja, q.answer, q.tip ?? '']), ...PARTS.flatMap((p) => p.tips)]
    expect(texts.filter(kanjiWithoutReading)).toEqual([])
    expect(all.filter((q) => !q.ko.trim() || !q.answerKo.trim() || !q.answer.trim())).toEqual([])
  })

  it('준비된 부는 실제 시험 문항 수보다 연습 문제가 많음', () => {
    expect(PART3.length).toBeGreaterThanOrEqual(partById(3).count)
    expect(PART4.length).toBeGreaterThanOrEqual(partById(4).count)
  })
})
