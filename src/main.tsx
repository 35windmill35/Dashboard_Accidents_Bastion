import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './app/styles/theme.css'
import './index.css'
// Инициализация темы (data-theme + палитра графиков) до первого рендера
import './shared/lib/theme/themeStore'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
