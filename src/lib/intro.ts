// 자기소개 만들기: 빈칸(이름·사는 곳·직업·가족·취미·공부 이유)을 고르면 일본어 문장으로 바꿔 줍니다.
// 일본어 문장은 단어 예문과 같은 후리가나 표기를 씁니다: 会社{かいしゃ}
import type { SjptQuestion } from '../data/sjpt'

export interface Option {
  id: string
  ja: string // 후리가나 표기 포함
  ko: string
}

/** 취미는 한 문장 더 붙여서 말할 거리를 늘려요 */
export interface HobbyOption extends Option {
  more: { ja: string; ko: string }
}

export interface Profile {
  name: string // 가타카나 이름 (예: キム)
  age: number | null
  city: string
  livesWith: 'family' | 'alone'
  job: string
  field: string // 회사원일 때 하는 일
  years: number | null // 지금 일을 한 지 몇 년
  family: string[] // 함께 소개할 가족 (나 제외)
  hobby: string
  reason: string
}

export interface Sentence {
  ja: string
  ko: string
}

export const SURNAMES: { ko: string; ja: string }[] = [
  { ko: '김', ja: 'キム' },
  { ko: '이', ja: 'イ' },
  { ko: '박', ja: 'パク' },
  { ko: '최', ja: 'チェ' },
  { ko: '정', ja: 'チョン' },
  { ko: '강', ja: 'カン' },
  { ko: '조', ja: 'チョ' },
  { ko: '윤', ja: 'ユン' },
  { ko: '장', ja: 'チャン' },
  { ko: '임', ja: 'イム' },
  { ko: '한', ja: 'ハン' },
  { ko: '오', ja: 'オ' },
  { ko: '서', ja: 'ソ' },
  { ko: '신', ja: 'シン' },
  { ko: '권', ja: 'クォン' },
  { ko: '황', ja: 'ファン' },
  { ko: '안', ja: 'アン' },
  { ko: '송', ja: 'ソン' },
  { ko: '홍', ja: 'ホン' },
]

export const CITIES: Option[] = [
  { id: 'seoul', ja: 'ソウル', ko: '서울' },
  { id: 'busan', ja: 'プサン', ko: '부산' },
  { id: 'incheon', ja: 'インチョン', ko: '인천' },
  { id: 'daegu', ja: 'テグ', ko: '대구' },
  { id: 'daejeon', ja: 'テジョン', ko: '대전' },
  { id: 'gwangju', ja: 'クァンジュ', ko: '광주' },
  { id: 'ulsan', ja: 'ウルサン', ko: '울산' },
  { id: 'suwon', ja: 'スウォン', ko: '수원' },
  { id: 'seongnam', ja: 'ソンナム', ko: '성남' },
  { id: 'yongin', ja: 'ヨンイン', ko: '용인' },
  { id: 'goyang', ja: 'コヤン', ko: '고양' },
]

export const JOBS: Option[] = [
  { id: 'company', ja: '会社員{かいしゃいん}', ko: '회사원' },
  { id: 'engineer', ja: 'エンジニア', ko: '엔지니어' },
  { id: 'civil', ja: '公務員{こうむいん}', ko: '공무원' },
  { id: 'teacher', ja: '教師{きょうし}', ko: '교사' },
  { id: 'nurse', ja: '看護師{かんごし}', ko: '간호사' },
  { id: 'self', ja: '自営業{じえいぎょう}', ko: '자영업' },
  { id: 'student', ja: '大学生{だいがくせい}', ko: '대학생' },
]

export const FIELDS: Option[] = [
  { id: 'it', ja: 'IT', ko: 'IT' },
  { id: 'sales', ja: '営業{えいぎょう}', ko: '영업' },
  { id: 'manufacturing', ja: '製造{せいぞう}', ko: '제조' },
  { id: 'quality', ja: '品質管理{ひんしつかんり}', ko: '품질관리' },
  { id: 'rnd', ja: '研究開発{けんきゅうかいはつ}', ko: '연구개발' },
  { id: 'design', ja: '設計{せっけい}', ko: '설계' },
  { id: 'office', ja: '事務{じむ}', ko: '사무' },
  { id: 'accounting', ja: '経理{けいり}', ko: '경리·회계' },
  { id: 'marketing', ja: 'マーケティング', ko: '마케팅' },
  { id: 'service', ja: 'サービス', ko: '서비스' },
]

export const FAMILY: Option[] = [
  { id: 'father', ja: '父{ちち}', ko: '아버지' },
  { id: 'mother', ja: '母{はは}', ko: '어머니' },
  { id: 'older-brother', ja: '兄{あに}', ko: '형(오빠)' },
  { id: 'older-sister', ja: '姉{あね}', ko: '누나(언니)' },
  { id: 'younger-brother', ja: '弟{おとうと}', ko: '남동생' },
  { id: 'younger-sister', ja: '妹{いもうと}', ko: '여동생' },
  { id: 'wife', ja: '妻{つま}', ko: '아내' },
  { id: 'husband', ja: '夫{おっと}', ko: '남편' },
  { id: 'son', ja: '息子{むすこ}', ko: '아들' },
  { id: 'daughter', ja: '娘{むすめ}', ko: '딸' },
]

export const HOBBIES: HobbyOption[] = [
  {
    id: 'travel',
    ja: '旅行{りょこう}',
    ko: '여행',
    more: { ja: '特{とく}に日本{にほん}の旅行{りょこう}が好{す}きです。', ko: '특히 일본 여행을 좋아합니다.' },
  },
  {
    id: 'movie',
    ja: '映画{えいが}を見{み}ること',
    ko: '영화 보기',
    more: { ja: '週末{しゅうまつ}はよく映画館{えいがかん}へ行{い}きます。', ko: '주말에는 자주 영화관에 갑니다.' },
  },
  {
    id: 'drama',
    ja: 'ドラマを見{み}ること',
    ko: '드라마 보기',
    more: { ja: '最近{さいきん}は日本{にほん}のドラマをよく見{み}ます。', ko: '요즘은 일본 드라마를 자주 봅니다.' },
  },
  {
    id: 'music',
    ja: '音楽{おんがく}を聞{き}くこと',
    ko: '음악 듣기',
    more: { ja: '通勤{つうきん}の時{とき}、いつも音楽{おんがく}を聞{き}いています。', ko: '출퇴근할 때 항상 음악을 듣고 있습니다.' },
  },
  {
    id: 'cooking',
    ja: '料理{りょうり}',
    ko: '요리',
    more: { ja: '週末{しゅうまつ}は家族{かぞく}に料理{りょうり}を作{つく}ります。', ko: '주말에는 가족에게 요리를 해 줍니다.' },
  },
  {
    id: 'exercise',
    ja: '運動{うんどう}',
    ko: '운동',
    more: { ja: '健康{けんこう}のために、毎朝{まいあさ}走{はし}っています。', ko: '건강을 위해 매일 아침 달리고 있습니다.' },
  },
  {
    id: 'hiking',
    ja: '山登{やまのぼ}り',
    ko: '등산',
    more: { ja: '月{つき}に一回{いっかい}、友達{ともだち}と山{やま}に登{のぼ}ります。', ko: '한 달에 한 번 친구와 산에 오릅니다.' },
  },
  {
    id: 'reading',
    ja: '読書{どくしょ}',
    ko: '독서',
    more: { ja: '寝{ね}る前{まえ}に本{ほん}を読{よ}むのが好{す}きです。', ko: '자기 전에 책을 읽는 것을 좋아합니다.' },
  },
  {
    id: 'games',
    ja: 'ゲーム',
    ko: '게임',
    more: { ja: '仕事{しごと}の後{あと}、友達{ともだち}とゲームをします。', ko: '일이 끝나고 친구와 게임을 합니다.' },
  },
  {
    id: 'photo',
    ja: '写真{しゃしん}を撮{と}ること',
    ko: '사진 찍기',
    more: { ja: '旅行{りょこう}の時{とき}、写真{しゃしん}をたくさん撮{と}ります。', ko: '여행할 때 사진을 많이 찍습니다.' },
  },
  {
    id: 'walking',
    ja: '散歩{さんぽ}',
    ko: '산책',
    more: { ja: '夜{よる}、家{いえ}の近{ちか}くの公園{こうえん}を散歩{さんぽ}します。', ko: '밤에 집 근처 공원을 산책합니다.' },
  },
  {
    id: 'golf',
    ja: 'ゴルフ',
    ko: '골프',
    more: { ja: '会社{かいしゃ}の人{ひと}とよくゴルフをします。', ko: '회사 사람들과 자주 골프를 칩니다.' },
  },
]

export const REASONS: Option[] = [
  {
    id: 'test',
    ja: '会社{かいしゃ}の試験{しけん}のために、日本語{にほんご}を勉強{べんきょう}しています。',
    ko: '회사 시험 때문에 일본어를 공부하고 있습니다.',
  },
  {
    id: 'work',
    ja: '仕事{しごと}で日本語{にほんご}が必要{ひつよう}なので、毎日{まいにち}勉強{べんきょう}しています。',
    ko: '일 때문에 일본어가 필요해서 매일 공부하고 있습니다.',
  },
  {
    id: 'travel',
    ja: '日本{にほん}へ旅行{りょこう}に行{い}くのが好{す}きなので、日本語{にほんご}を勉強{べんきょう}しています。',
    ko: '일본 여행을 좋아해서 일본어를 공부하고 있습니다.',
  },
  {
    id: 'culture',
    ja: '日本{にほん}の文化{ぶんか}に興味{きょうみ}があるので、日本語{にほんご}を勉強{べんきょう}しています。',
    ko: '일본 문화에 관심이 있어서 일본어를 공부하고 있습니다.',
  },
  {
    id: 'media',
    ja: '日本{にほん}のドラマやアニメが好{す}きなので、日本語{にほんご}を勉強{べんきょう}しています。',
    ko: '일본 드라마나 애니메이션을 좋아해서 일본어를 공부하고 있습니다.',
  },
]

export const defaultProfile: Profile = {
  name: '',
  age: null,
  city: 'seoul',
  livesWith: 'family',
  job: 'company',
  field: 'it',
  years: null,
  family: [],
  hobby: 'travel',
  reason: 'test',
}

// 사람 수 세기: 1人(ひとり), 2人(ふたり), 4人(よにん)처럼 읽기가 불규칙해서 표로 정리
const PEOPLE: Record<number, string> = {
  2: '二人{ふたり}',
  3: '三人{さんにん}',
  4: '四人{よにん}',
  5: '五人{ごにん}',
  6: '六人{ろくにん}',
  7: '七人{しちにん}',
  8: '八人{はちにん}',
  9: '九人{きゅうにん}',
  10: '十人{じゅうにん}',
  11: '十一人{じゅういちにん}',
}

const find = <T extends Option>(list: T[], id: string): T | undefined => list.find((o) => o.id === id)

// ── 주제별 문장 (자기소개 전체와 SJPT 1부 질문 답에 같이 써요) ──

function nameLine(p: Profile): Sentence | null {
  const name = p.name.trim()
  return name ? { ja: `${name}と申{もう}します。`, ko: `${name}(이)라고 합니다.` } : null
}

function cityLine(p: Profile): Sentence | null {
  const city = find(CITIES, p.city)
  if (!city) return null
  return p.livesWith === 'family'
    ? { ja: `${city.ja}に家族{かぞく}と住{す}んでいます。`, ko: `${city.ko}에서 가족과 살고 있습니다.` }
    : { ja: `${city.ja}に一人{ひとり}で住{す}んでいます。`, ko: `${city.ko}에서 혼자 살고 있습니다.` }
}

function jobLines(p: Profile): Sentence[] {
  const job = find(JOBS, p.job)
  if (!job) return []
  const out: Sentence[] = []
  const field = find(FIELDS, p.field)
  if (job.id === 'company' && field) {
    out.push({
      ja: `${job.ja}で、${field.ja}の仕事{しごと}をしています。`,
      ko: `${job.ko}이고, ${field.ko} 일을 하고 있습니다.`,
    })
  } else {
    out.push({ ja: `${job.ja}です。`, ko: `${job.ko}입니다.` })
  }
  if (p.years && job.id !== 'student') {
    out.push(
      job.id === 'company'
        ? { ja: `入社{にゅうしゃ}して${p.years}年{ねん}になります。`, ko: `입사한 지 ${p.years}년 됐습니다.` }
        : {
            ja: `この仕事{しごと}を始{はじ}めて${p.years}年{ねん}になります。`,
            ko: `이 일을 시작한 지 ${p.years}년 됐습니다.`,
          },
    )
  }
  return out
}

function familyLine(p: Profile): Sentence | null {
  const members = FAMILY.filter((f) => p.family.includes(f.id))
  const count = PEOPLE[members.length + 1]
  if (members.length === 0 || !count) return null
  return {
    ja: `家族{かぞく}は${count}です。${[...members.map((m) => m.ja), '私{わたし}'].join('と')}です。`,
    ko: `가족은 ${members.length + 1}명입니다. ${members.map((m) => m.ko).join(', ')}, 그리고 저입니다.`,
  }
}

function hobbyLines(p: Profile): Sentence[] {
  const hobby = find(HOBBIES, p.hobby)
  return hobby ? [{ ja: `趣味{しゅみ}は${hobby.ja}です。`, ko: `취미는 ${hobby.ko}입니다.` }, hobby.more] : []
}

function reasonLine(p: Profile): Sentence | null {
  const reason = find(REASONS, p.reason)
  return reason ? { ja: reason.ja, ko: reason.ko } : null
}

const present = <T,>(x: T | null): x is T => x !== null

/** 빈칸을 채운 만큼 자기소개 문장을 만들어요. 안 고른 칸의 문장은 건너뜁니다. */
export function buildIntro(p: Profile): Sentence[] {
  const name = nameLine(p)
  return [
    name
      ? { ja: `はじめまして。${name.ja}`, ko: `처음 뵙겠습니다. ${name.ko}` }
      : { ja: 'はじめまして。', ko: '처음 뵙겠습니다.' },
    p.age ? { ja: `${p.age}歳{さい}です。`, ko: `${p.age}살입니다.` } : null,
    cityLine(p),
    ...jobLines(p),
    familyLine(p),
    ...hobbyLines(p),
    reasonLine(p),
    { ja: 'どうぞよろしくお願{ねが}いします。', ko: '잘 부탁드립니다.' },
  ].filter(present)
}

/**
 * SJPT 1부: 자기소개 질문과, 내 빈칸으로 만든 모범 답.
 * 실제 시험처럼 이름을 먼저 묻고, 나머지는 섞어서 3개를 고르면 돼요.
 */
export function part1Questions(p: Profile): SjptQuestion[] {
  const join = (lines: Sentence[]) =>
    lines.length ? { answer: lines.map((s) => s.ja).join(''), answerKo: lines.map((s) => s.ko).join(' ') } : null
  const items: [string, string, string, { answer: string; answerKo: string } | null][] = [
    ['p1-name', 'お名前{なまえ}は何{なん}ですか。', '이름이 무엇입니까?', join([nameLine(p)].filter(present))],
    ['p1-city', 'どこに住{す}んでいますか。', '어디에 살고 있습니까?', join([cityLine(p)].filter(present))],
    ['p1-job', 'お仕事{しごと}は何{なん}ですか。', '무슨 일을 합니까?', join(jobLines(p))],
    ['p1-family', 'ご家族{かぞく}は何人{なんにん}ですか。', '가족은 몇 명입니까?', join([familyLine(p)].filter(present))],
    ['p1-hobby', '趣味{しゅみ}は何{なん}ですか。', '취미는 무엇입니까?', join(hobbyLines(p))],
    [
      'p1-reason',
      'どうして日本語{にほんご}を勉強{べんきょう}していますか。',
      '왜 일본어를 공부하고 있습니까?',
      join([reasonLine(p)].filter(present)),
    ],
  ]
  return items
    .filter((it) => it[3] !== null)
    .map(([id, ja, ko, a]) => ({ id, ja, ko, ...a! }))
}
