import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
// Rubik локально, без Google Fonts (латиница и кириллица, включая казахские буквы)
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
import { t } from './shared/i18n'
import App from './App.tsx'

// В index.html — запасной заголовок до загрузки бандла
document.title = t('roadAccidents.appTitle')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
