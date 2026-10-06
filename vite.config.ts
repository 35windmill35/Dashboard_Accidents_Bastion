import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base — путь на GitHub Pages (HashRouter, маршруты не затрагивает).
// Тесты настроены в vitest.config.ts.
export default defineConfig({
  plugins: [react()],
  base: '/Dashboard_Accidents_Bastion/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
