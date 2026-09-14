import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base временно "/" — путь деплоя ещё не известен, поправить когда
// определится. Роутинг на HashRouter, так что base влияет только на пути
// к статике, не на маршруты.
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
