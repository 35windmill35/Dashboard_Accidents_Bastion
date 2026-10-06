import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { LoginPage } from '@/pages/login/LoginPage'
import { RequireAccidentsAccess } from '@/app/providers/RequireAccidentsAccess'
import { AccidentDrilldownModal } from '@/widgets/accident-drilldown/AccidentDrilldownModal'
import { PdfGeneratingOverlay } from '@/features/pdf-report/ui/PdfGeneratingOverlay'
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton'

// Экраны с графиками — отдельными чанками
const OverviewPage = lazy(() =>
  import('@/pages/overview/OverviewPage').then((m) => ({ default: m.OverviewPage }))
)
const MotorcadePage = lazy(() =>
  import('@/pages/motorcade/MotorcadePage').then((m) => ({ default: m.MotorcadePage }))
)
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
)

function Protected({ children }: { children: ReactNode }) {
  return (
    <RequireAccidentsAccess>
      <Suspense fallback={<Skeleton height={320} />}>{children}</Suspense>
    </RequireAccidentsAccess>
  )
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route
          path="/"
          element={
            <Protected>
              <OverviewPage />
            </Protected>
          }
        />
        <Route
          path="/motorcade"
          element={
            <Protected>
              <MotorcadePage />
            </Protected>
          }
        />
        <Route
          path="/analytics"
          element={
            <Protected>
              <AnalyticsPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AccidentDrilldownModal />
      <PdfGeneratingOverlay />
    </>
  )
}

export default App
