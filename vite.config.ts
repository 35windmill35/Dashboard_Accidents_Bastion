import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base — путь проекта на GitHub Pages (35windmill35.github.io/Dashboard_Accidents_Bastion/).
// Роутинг на HashRouter, так что base влияет только на пути к статике, не
// на маршруты.
//
// Настройки тестов — в vitest.config.ts: dev-сервер и сборка не должны
// зависеть от того, установлен ли vitest.
export default defineConfig({
  plugins: [react()],
  base: '/Dashboard_Accidents_Bastion/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
