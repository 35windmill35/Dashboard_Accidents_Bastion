import { Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { RegisterPage } from '@/pages/register/RegisterPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'
import { MotorcadePage } from '@/pages/motorcade/MotorcadePage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { RequireAccidentsAccess } from '@/app/providers/RequireAccidentsAccess'
import { AccidentDrilldownModal } from '@/widgets/accident-drilldown/AccidentDrilldownModal'

// /register — заглушка, регистрацию по телефону не делаем (заказчик
// пользуется своей формой), ссылки на неё в UI нет.
//
// Три защищённых экрана обёрнуты в RequireAccidentsAccess — проверка
// сессии, прав по базам и общий сайдбар/шапка (см. AppShell внутри guard).
// Модалка детализации — одна на всё приложение, монтируется здесь и сама
// решает, показываться ли (drilldownStore.isOpen).
function App() {
  return (
    <>
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
      <AccidentDrilldownModal />
    </>
  )
}

export default App
