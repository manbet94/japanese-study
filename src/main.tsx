import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// 브라우저가 저장공간이 부족할 때 학습 기록을 지우지 않도록 요청
navigator.storage?.persist?.()

// 새 버전이 배포되면 받아서 자동으로 새로고침.
// 폰에서는 앱이 백그라운드에 남아 있는 경우가 많아서, 앱으로 돌아올 때마다 업데이트를 확인합니다.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration.update()
    }
    document.addEventListener('visibilitychange', check)
    setInterval(check, 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
