import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './locales/i18n'

window.onerror = function (message, source, lineno, colno, error) {
  alert(`[전역 런타임 에러 감지]\n메시지: ${message}\n위치: ${source}:${lineno}:${colno}\n스택: ${error?.stack}`)
  return false
}

window.onunhandledrejection = function (event) {
  alert(`[비동기 프로미스 거부 감지]\n이유: ${event.reason}\n스택: ${event.reason?.stack}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
