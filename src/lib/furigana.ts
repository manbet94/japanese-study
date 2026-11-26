// 후리가나(한자 위 히라가나) 처리.
// 예문은 '会社{かいしゃ}へ行{い}きます' 처럼 한자 뒤 { } 안에 읽기를 적습니다.

export interface Seg {
  text: string
  ruby?: string
}

const KANJI = '[\\u3400-\\u9fff\\uf900-\\ufaff々〆ヶ]'
const ANNOT = new RegExp(`(${KANJI}+)\\{([^}]+)\\}`, 'g')
const HAS_KANJI = new RegExp(KANJI)

export function parseFurigana(s: string): Seg[] {
  const segs: Seg[] = []
  let last = 0
  for (const m of s.matchAll(ANNOT)) {
    if (m.index > last) segs.push({ text: s.slice(last, m.index) })
    segs.push({ text: m[1], ruby: m[2] })
    last = m.index + m[0].length
  }
  if (last < s.length) segs.push({ text: s.slice(last) })
  return segs
}

/** 읽기 표시를 뺀 일반 문장 (발음 듣기용) */
export function plainText(s: string): string {
  return s.replace(ANNOT, '$1')
}

/** 한자를 읽기로 바꾼 문장 */
export function kanaText(s: string): string {
  return s.replace(ANNOT, '$2')
}

export function hasKanji(s: string): boolean {
  return HAS_KANJI.test(s)
}

/** 단어 + 읽기 → 한자 부분에만 후리가나. 예: 大きい/おおきい → 大(おお)きい */
export function wordSegments(word: string, reading: string): Seg[] {
  if (word === reading || !hasKanji(word)) return [{ text: word }]
  let p = 0
  while (p < word.length && p < reading.length && word[p] === reading[p]) p++
  let s = 0
  while (s < word.length - p && s < reading.length - p && word[word.length - 1 - s] === reading[reading.length - 1 - s]) s++
  const segs: Seg[] = []
  if (p) segs.push({ text: word.slice(0, p) })
  segs.push({ text: word.slice(p, word.length - s), ruby: reading.slice(p, reading.length - s) })
  if (s) segs.push({ text: word.slice(word.length - s) })
  return segs
}
