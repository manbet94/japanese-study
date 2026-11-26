import { parseFurigana, wordSegments, type Seg } from '../lib/furigana'

function Segs({ segs, show }: { segs: Seg[]; show: boolean }) {
  return (
    <>
      {segs.map((s, i) =>
        s.ruby && show ? (
          <ruby key={i}>
            {s.text}
            <rt>{s.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  )
}

/** 예문: '会社{かいしゃ}' 표기를 후리가나로 */
export function Furigana({ text, show = true }: { text: string; show?: boolean }) {
  return (
    <span lang="ja">
      <Segs segs={parseFurigana(text)} show={show} />
    </span>
  )
}

/** 단어: 한자 부분 위에 읽기 */
export function WordText({ word, reading, show = true }: { word: string; reading: string; show?: boolean }) {
  return (
    <span lang="ja">
      <Segs segs={wordSegments(word, reading)} show={show} />
    </span>
  )
}
