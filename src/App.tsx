import { useState } from 'react'
import type { StudyMode } from './lib/session'
import { Home } from './pages/Home'
import { SettingsPage } from './pages/SettingsPage'
import { Speaking } from './pages/Speaking'
import { Study } from './pages/Study'
import { WordList } from './pages/WordList'

type Tab = 'home' | 'words' | 'speak' | 'settings'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'words', icon: '📚', label: '단어장' },
  { id: 'speak', icon: '🎤', label: '말하기' },
  { id: 'settings', icon: '⚙️', label: '설정' },
]

function App() {
  const [tab, setTab] = useState<Tab>('home')
  // run: 같은 모드를 연달아 시작해도(세트 한 번 더) 화면을 새로 만들기 위한 번호
  const [studying, setStudying] = useState<{ mode: StudyMode; run: number } | null>(null)
  const start = (mode: StudyMode) => setStudying((s) => ({ mode, run: (s?.run ?? 0) + 1 }))

  if (studying)
    return <Study key={studying.run} mode={studying.mode} onExit={() => setStudying(null)} onStart={start} />

  return (
    <>
      <main className="app">
        {tab === 'home' && <Home onStart={start} />}
        {tab === 'words' && <WordList />}
        {tab === 'speak' && <Speaking />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default App
