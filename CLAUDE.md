# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal Japanese-study PWA (Korean-speaking user, Galaxy S23, installed from Chrome). Goal is passing **SJPT (speaking test) level 5**, so speaking practice outranks reading drills when prioritizing features. Everything must stay free: no backend and no paid APIs. Speech uses the browser's built-in Web Speech API, and all study data lives on the device in IndexedDB.

All user-facing text is Korean; Japanese content shows furigana. The user is a first-time developer, so explain phone/GitHub steps concretely.

## Commands

```bash
npm run dev                      # dev server (http://localhost:5173)
npm run build                    # tsc -b + vite build (also generates the service worker)
npm test                         # vitest run (all tests)
npx vitest run -t "후리가나"       # run tests whose name matches
npm run lint                     # oxlint
```

- **Deploy:** pushing to `main` triggers `.github/workflows/deploy.yml`. It builds with `vite build --base=/<repo-name>/` and publishes to GitHub Pages at https://manbet94.github.io/japanese-study/. No manual deploy step exists.
- **Dev server after `npm install`:** restart the dev server whenever dependencies change. Otherwise Vite serves stale optimized deps (a 504 "Outdated Optimize Dep" error) and the page renders blank.

## Architecture

Single-page React app with no router. `App.tsx` switches between tabs (Home, WordList, SettingsPage) and a full-screen `Study` session. Starting a session bumps a `run` key so that "one more set" remounts `Study` fresh.

**Data flow:** `src/data/vocab.ts` holds the static word list. Progress lives in Dexie tables (`src/db/db.ts`). `src/lib/session.ts` combines the two into a study queue.

- **Vocab data** (`src/data/vocab.ts`): compact tuple rows `[word, reading, meaning, example, exampleKo]`, one array per JLPT level.
  - A word's id is `${level}:${word}`. Renaming a word's `word` field orphans its saved progress.
  - Examples carry inline furigana markup on **every** kanji run: `会社{かいしゃ}へ行{い}きます。`. A test fails if any kanji in an example is missing a reading.
  - `src/lib/furigana.ts` parses the markup. It also auto-derives ruby for headwords by stripping the kana prefix and suffix shared by word and reading (大きい/おおきい → 大(おお)きい).
  - Use `plainText()` / `examplePlain()` when passing an example to TTS.
- **Scheduling** (`src/lib/srs.ts`): deliberately simple, as the user chose. A right answer moves along `CORRECT_STEPS` = 3 → 7 → 14 → 30 days. A wrong answer sets the card 1 day out and resets `reps`. There are no self-grade buttons.
- **Sessions** (`src/lib/session.ts`): two modes.
  - `review`: every card due on or before today.
  - `new`: one set of `settings.setSize` unseen words. There is no daily cap; the user repeats sets freely.
  - New words first appear as `intro` items, then as 3-choice `quiz` items.
  - A wrong answer appends a `retry` quiz to the end of the queue. Retries never change the schedule, the score, or the history.
- **Database** (`src/db/db.ts`): tables `cards` (SRS state), `logs` (per-day counters plus the `done` flag used for streaks), `kv` (settings under the key `'settings'`, merged over `defaultSettings`), and `history` (one row per graded answer, used by `DayDetail`).
  - Schema changes must add a new `db.version(n)`. Never edit an existing version, because users' phones hold real data.
  - When adding a table, also add it to `src/lib/backup.ts` (JSON export/import is the only migration path between devices or origins).
- **Dates** are local-time `YYYY-MM-DD` strings (`src/lib/date.ts`), never `Date` objects or UTC.
- **PWA updates:** `main.tsx` calls `registerSW({ immediate: true })` and also checks for an update on `visibilitychange`. The app is kept in memory on Android, so updates must not depend on a fresh launch.
- **Version label:** shown in both `pages/Home.tsx` and `pages/SettingsPage.tsx`. Bump both with each release.

## Gotchas

- **Korean text and PowerShell:** Windows PowerShell 5.1's `Get-Content` / `Set-Content` without `-Encoding utf8` corrupts the Korean text in source files. Edit files with the editor tools, not shell text replacement.
- **Git identity:** this repo's local git config uses the GitHub noreply address. The user does not want their personal email in public commits, so do not change it.
- **Data is tied to the origin:** IndexedDB data belongs to the site address. If the GitHub username or the repo name changes, the app URL changes and the user must move their data with Settings → backup → restore.
