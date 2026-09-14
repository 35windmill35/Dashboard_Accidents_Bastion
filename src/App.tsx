import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'
import { MotorcadePage } from '@/pages/motorcade/MotorcadePage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'

// Каркас маршрутов трёх экранов дашборда (ТЗ §4) + логин/регистрация.
// Экраны пока — заглушки (реализуются в следующих этапах, см. план
// проекта); авторизационный guard (редирект неавторизованных на /login,
// ProtectedLayout с сайдбаром/шапкой фильтров) добавляется на этапе
// «Слой API и авторизация» и «Экран Обзор» — здесь его специально нет,
// чтобы не тянуть в Этап 1 ещё не существующие authStore/periodsStore.
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<OverviewPage />} />
      <Route path="/motorcade" element={<MotorcadePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  )
}

export default App
