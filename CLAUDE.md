# CLAUDE.md

이 저장소에서 작업할 때 Claude Code(claude.ai/code)가 참고하는 안내서예요.

## 어떤 앱인가

개인용 일본어 학습 PWA예요. 사용자는 한국어를 쓰고, 갤럭시 S23의 Chrome에서 설치해 써요.

- 목표는 **SJPT(말하기 시험) 레벨 5** 합격이에요. 그래서 기능의 우선순위를 정할 때 읽기 연습보다 말하기 연습이 먼저예요.
- 모든 것은 무료여야 해요. 서버도, 유료 API도 쓰지 않아요.
- 음성은 브라우저에 들어 있는 Web Speech API를 써요.
- 학습 기록은 모두 폰 안의 IndexedDB에 저장돼요.

화면의 글자는 모두 한국어이고, 일본어에는 후리가나를 달아요. 사용자는 처음 개발을 해 보는 사람이라서, 폰이나 GitHub에서 할 일은 구체적으로 설명해요.

## 명령어

```bash
npm run dev                      # 개발 서버 (http://localhost:5173)
npm run build                    # tsc -b + vite build (서비스 워커도 함께 만듦)
npm test                         # vitest run (테스트 전체)
npx vitest run -t "후리가나"       # 이름에 이 글자가 들어간 테스트만
npm run lint                     # oxlint
```

- **배포 명령:** 사용자가 `/release [버전]`을 입력해요(`.claude/skills/release/SKILL.md`).
  - 버전 표시를 올리고, 테스트·검사·빌드를 한 뒤 커밋하고 푸시해요.
  - 그다음 배포된 사이트에 새 버전 표시가 뜰 때까지 확인해요.
  - 서비스 워커 캐시 번호는 손으로 올리지 않아요. `generateSW`가 빌드할 때마다 파일 해시를 새로 만들기 때문이에요.
- **자동 배포:** `main`에 푸시하면 `.github/workflows/deploy.yml`이 실행돼요.
  - `vite build --base=/<저장소이름>/`으로 빌드해서 GitHub Pages(https://manbet94.github.io/japanese-study/)에 올려요.
  - 손으로 배포하는 단계는 없어요.
- **`npm install` 뒤 개발 서버:** 패키지가 바뀌면 개발 서버를 다시 켜야 해요. 그대로 두면 Vite가 예전에 최적화한 패키지를 내보내서(504 "Outdated Optimize Dep" 에러) 화면이 하얗게 나와요.

## 구조

라우터 없는 한 페이지짜리 React 앱이에요.

- `App.tsx`가 탭(Home, WordList, Speaking, SettingsPage)과 전체 화면 `Study` 학습 화면을 바꿔 가며 보여 줘요.
- 학습을 시작할 때마다 `run` 번호를 올려요. 그래서 "한 세트 더"를 누르면 `Study`가 새로 만들어져요.

**데이터 흐름:**

- `src/data/vocab.ts`에 고정된 단어 목록이 있어요.
- 학습 진도는 Dexie 테이블(`src/db/db.ts`)에 저장돼요.
- `src/lib/session.ts`가 이 둘을 합쳐서 공부할 순서를 만들어요.

### 단어 데이터 (`src/data/vocab.ts`)

- 한 단어는 `[단어, 읽기, 뜻, 예문, 예문 해석]` 형태의 짧은 배열이에요.
- 단어들은 품사별 묶음 `[pos, rows[]]`으로 나뉘어 있어요.
  - 품사: `noun`(명사), `verb`(동사), `i-adj`(い형용사), `na-adj`(な형용사), `adv`(부사), `other`(기타)
  - JLPT 급수마다 이런 묶음의 배열이 하나씩 있어요.
- 단어 id는 `${level}:${word}`예요.
  - `word` 칸을 바꾸면 그 단어의 저장된 진도와 연결이 끊겨요.
  - 다른 묶음으로 옮기거나 순서를 바꾸는 건 괜찮아요.
- **품사 필터:**
  - 화면에서는 `PosFilter`로 걸러요. い형용사와 な형용사는 `adj` 하나로 합쳐요.
  - 새 단어를 어떤 품사에서 배울지는 `settings.newPos`로 정해요.
  - `all`이면 `interleaveByPos`가 품사를 골고루 섞어요. N5가 N4보다 먼저 나와요.
- **3지선다 오답 보기:**
  - 정답과 같은 품사를 먼저 골라요.
  - `meaningKeys`는 정답과 뜻이 겹치는 단어(예: 思う/考える)를 빼요.
  - 단어를 추가할 때는 뜻이 겹치지 않게 써야 해요. 모든 단어를 테스트가 확인해요.
- **예문의 후리가나:**
  - 예문의 **모든** 한자 덩어리에 읽기를 붙여요: `会社{かいしゃ}へ行{い}きます。`
  - 읽기가 빠진 한자가 하나라도 있으면 테스트가 실패해요.
- **`src/lib/furigana.ts`:**
  - 위 표기를 읽어서 후리가나로 바꿔요.
  - 표제어는 단어와 읽기에 공통으로 붙은 앞뒤 가나를 떼어 내서 후리가나를 자동으로 만들어요(大きい/おおきい → 大(おお)きい).
- 예문을 음성(TTS)으로 읽힐 때는 `plainText()` / `examplePlain()`을 써요.

### 복습 일정 (`src/lib/srs.ts`)

사용자가 고른 대로 일부러 단순하게 만들었어요.

- 맞히면 `CORRECT_STEPS` = 3 → 7 → 14 → 30일 순서로 간격이 늘어나요.
- 틀리면 하루 뒤로 잡고 `reps`를 처음으로 돌려요.
- 스스로 점수를 매기는 버튼은 없어요.

### 학습 세션 (`src/lib/session.ts`)

모드는 두 가지예요.

- `review`: 오늘 또는 그 전에 복습일이 된 카드를 모두 복습해요.
- `new`: 아직 안 배운 단어를 `settings.setSize`개씩 한 세트로 배워요. 하루 제한은 없어서 세트를 원하는 만큼 반복할 수 있어요.

세트 안에서는 이렇게 진행돼요.

- 새 단어는 먼저 `intro`(소개 카드)로 보여 주고, 그다음 `quiz`(3지선다)로 확인해요.
- 틀리면 대기열 끝에 `retry` 문제를 하나 더 붙여요. 이 재도전은 복습 일정, 점수, 기록을 바꾸지 않아요.

### 말하기 (`pages/Speaking.tsx`)

SJPT 1~7부 메뉴예요. 1부는 자기소개 화면을 열고, 준비된 다른 부는 바로 `pages/SjptPractice.tsx`로 가요.

- **`src/data/sjpt.ts`:**
  - `PARTS`에 부별 준비·답변 시간(초)과 문항 수가 있어요. `comingIn`이 있는 부는 아직 못 만든 부라서 흐리게 보여요.
  - 연습 문제 모음(`PART3`, `PART4`)도 여기 있어요. 문제는 직접 만든 것이고, 실제 기출을 옮기지 않아요.
- **`SjptPractice`:** 문제마다 같은 순서로 돌아가요.
  1. 질문 음성(TTS)
  2. 준비 시간 카운트다운
  3. "삐" 소리와 함께 자동 녹음되는 답변 시간 카운트다운
  4. 모범 답안과 비교
  - 녹음은 `sjpt:<문제id>`라는 이름으로 저장해요.
- **`speakJapanese(text, rate, onEnd)`:**
  - TTS가 다 읽으면 `onEnd`를 불러요.
  - 읽기를 취소해도 `onEnd`가 불리기 때문에, 부르는 쪽에서 번호표(token)로 막아요(`listenToken` 참고).
- **`src/lib/intro.ts`:**
  - 빈칸 선택지로 된 `Profile`을 후리가나가 달린 문장으로 바꿔요.
  - `part1Questions`는 같은 프로필로 1부 모범 답을 만들어요.
  - 모든 선택지의 일본어에는 읽기가 있어야 해요. 선택지, 질문, 답, 팁을 모두 테스트가 확인해요.
- **녹음 (`src/lib/recorder.ts`):**
  - `MediaRecorder`를 감싼 파일이에요.
  - 녹음은 Blob으로 저장하고, 이름(key)마다 최근 `KEEP_RECORDINGS`개만 남겨요.
- **녹음 기록과 연속 학습일:**
  - 녹음을 저장할 때마다 `logs.speaking`이 1씩 늘어나요.
  - 그날은 "조금 공부한 날"(`part` 표시)이 되지만 `done`은 켜지지 않아요. 그래서 연속 학습일은 여전히 단어 학습으로만 쌓여요.
- **Browser 창에서 녹음 시험하기:** Browser 창은 마이크를 막아요. 시험할 때는 `navigator.mediaDevices.getUserMedia`를 `AudioContext` 발진기(oscillator) 소리로 바꿔치기해서 해요.

### 저장소 (`src/db/db.ts`)

테이블은 다섯 개예요.

| 테이블 | 저장하는 것 |
|---|---|
| `cards` | 단어별 복습 상태 |
| `logs` | 날짜별 횟수와 연속 학습일에 쓰는 `done` 표시 |
| `kv` | `'settings'`에 설정(`defaultSettings` 위에 덮어씀), `'profile'`에 자기소개 |
| `history` | 문제 하나를 풀 때마다 한 줄 (`DayDetail`이 사용) |
| `recordings` | 말하기 녹음 (v3) |

- 저장소 구조를 바꿀 때는 반드시 새 `db.version(n)`을 추가해요. 이미 있는 버전은 절대 고치지 않아요. 사용자의 폰에 실제 학습 기록이 들어 있기 때문이에요.
- 테이블을 추가하면 `src/lib/backup.ts`에도 넣어요. JSON 백업/복원이 기기나 주소를 옮길 때 기록을 옮기는 유일한 방법이에요.
- 예외는 `recordings` 하나예요. 용량이 커서 일부러 백업에서 뺐어요.

### 그 밖의 규칙

- **날짜:** 현지 시간 기준 `YYYY-MM-DD` 문자열로 다뤄요(`src/lib/date.ts`). `Date` 객체나 UTC는 쓰지 않아요.
- **PWA 업데이트:**
  - `main.tsx`가 `registerSW({ immediate: true })`를 부르고, 앱으로 돌아올 때(`visibilitychange`)도 업데이트를 확인해요.
  - 안드로이드는 앱을 메모리에 남겨 두기 때문에, 앱을 새로 켤 때만 업데이트되게 하면 안 돼요.
- **버전 표시:** `pages/Home.tsx`와 `pages/SettingsPage.tsx` 두 곳에 있어요. 배포할 때마다 둘 다 올려요.

## 주의할 점

- **한글과 PowerShell:** Windows PowerShell 5.1의 `Get-Content` / `Set-Content`를 `-Encoding utf8` 없이 쓰면 소스 파일의 한글이 깨져요. 파일은 셸에서 글자를 바꾸지 말고 편집 도구로 고쳐요.
- **git 사용자 정보:** 이 저장소의 git 설정은 GitHub noreply 주소를 써요. 사용자는 공개 커밋에 개인 이메일이 나가는 걸 원하지 않으니 바꾸지 말아요.
- **기록은 사이트 주소에 묶여 있어요:**
  - IndexedDB 기록은 사이트 주소별로 따로 저장돼요.
  - GitHub 사용자 이름이나 저장소 이름이 바뀌면 앱 주소도 바뀌어요.
  - 그때는 설정 → 백업 → 복원으로 기록을 옮겨야 해요.
