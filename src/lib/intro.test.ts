import { describe, expect, it } from 'vitest'
import { hasKanji, parseFurigana } from './furigana'
import { buildIntro, CITIES, defaultProfile, FAMILY, FIELDS, HOBBIES, JOBS, REASONS, type Profile } from './intro'

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
