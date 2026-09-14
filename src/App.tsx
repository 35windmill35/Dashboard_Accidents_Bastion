import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'
import { MotorcadePage } from '@/pages/motorcade/MotorcadePage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { RequireAccidentsAccess } from '@/app/providers/RequireAccidentsAccess'

// /register — заглушка, регистрацию по телефону не делаем (заказчик
// пользуется своей формой), ссылки на неё в UI нет.
//
// Три защищённых экрана обёрнуты в RequireAccidentsAccess — проверка
// сессии и прав по базам. Сайдбар и шапка с фильтрами добавятся позже.
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAccidentsAccess>
            <OverviewPage />
          </RequireAccidentsAccess>
        }
      />
      <Route
        path="/motorcade"
        element={
          <RequireAccidentsAccess>
            <MotorcadePage />
          </RequireAccidentsAccess>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireAccidentsAccess>
            <AnalyticsPage />
          </RequireAccidentsAccess>
        }
      />
    </Routes>
  )
}

export default App
