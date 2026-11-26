import { useState } from 'react'
import type { StudyMode } from './lib/session'
import { Home } from './pages/Home'
import { SettingsPage } from './pages/SettingsPage'
import { Study } from './pages/Study'
import { WordList } from './pages/WordList'

type Tab = 'home' | 'words' | 'settings'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: '홈' },
  { id: 'words', icon: '📚', label: '단어장' },
  { id: 'settings', icon: '⚙️', label: '설정' },
]

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [studying, setStudying] = useState<StudyMode | null>(null)

  if (studying) return <Study mode={studying} onExit={() => setStudying(null)} />

  return (
    <>
      <main className="app">
        {tab === 'home' && <Home onStart={setStudying} />}
        {tab === 'words' && <WordList />}
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
