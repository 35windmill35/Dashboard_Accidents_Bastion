import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
// Rubik — из пакета, без Google Fonts: в закрытых сетях внешний CDN
// недоступен, а запрос к нему передаёт IP пользователя третьей стороне
// (только латиница и кириллица, включая казахские буквы из cyrillic-ext)
import '@fontsource/rubik/latin-400.css'
import '@fontsource/rubik/latin-ext-400.css'
import '@fontsource/rubik/cyrillic-400.css'
import '@fontsource/rubik/cyrillic-ext-400.css'
import '@fontsource/rubik/latin-500.css'
import '@fontsource/rubik/latin-ext-500.css'
import '@fontsource/rubik/cyrillic-500.css'
import '@fontsource/rubik/cyrillic-ext-500.css'
import '@fontsource/rubik/latin-600.css'
import '@fontsource/rubik/latin-ext-600.css'
import '@fontsource/rubik/cyrillic-600.css'
import '@fontsource/rubik/cyrillic-ext-600.css'
import '@fontsource/rubik/latin-700.css'
import '@fontsource/rubik/latin-ext-700.css'
import '@fontsource/rubik/cyrillic-700.css'
import '@fontsource/rubik/cyrillic-ext-700.css'
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
