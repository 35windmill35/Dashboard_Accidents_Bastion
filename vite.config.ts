import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Base — по умолчанию "/": путь деплоя (поддомен/подпапка BASTION GROUP)
// пока не известен. Когда определится (см. открытые вопросы к заказчику),
// поправить здесь по аналогии с Dashboard_tochki_rosta_TypeScript
// (там base зависит от command и пути GitHub Pages).
//
// Роутинг — HashRouter (см. src/main.tsx), поэтому base влияет только на
// пути к статике (JS/CSS/картинки в index.html), не на маршруты.
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
