import { Router, Route, Navigate } from '@solidjs/router'
import { Show } from 'solid-js'
import { useAuth } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/Login'
import RegisterPage from './pages/auth/Register'
import OAuthCallbackPage from './pages/auth/OAuthCallback'
import DashboardPage from './pages/dashboard/Dashboard'
import WorkoutPage from './pages/workout/Workout'
import WorkoutHistoryPage from './pages/workout/History'
import RoutinesPage from './pages/routines/Routines'
import RoutineBuilderPage from './pages/routines/Builder'
import ExercisesPage from './pages/exercises/Exercises'
import ExerciseDetailPage from './pages/exercises/Detail'
import AnalyticsPage from './pages/analytics/Analytics'
import BodyPage from './pages/body/Body'
import ToolsPage from './pages/tools/Tools'
import PlateCalculatorPage from './pages/tools/PlateCalculator'
import HevyImportPage from './pages/tools/HevyImport'

function App() {
  const { user, isLoading } = useAuth()

  return (
    <Show when={!isLoading()} fallback={
      <div class="flex items-center justify-center h-screen bg-[#0a0a0a] bg-[#0a0a0a]">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <Router root={(props) => <AppLayout>{props.children}</AppLayout>}>
        {/* Auth routes - accessible when not logged in */}
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/oauth/callback" component={OAuthCallbackPage} />
        
        {/* Protected routes - only accessible when logged in */}
        <Show when={user()} fallback={<Route path="*" component={() => <Navigate href="/login" />} />}>
          <Route path="/" component={DashboardPage} />
          <Route path="/workout" component={WorkoutPage} />
          <Route path="/workout/history" component={WorkoutHistoryPage} />
          <Route path="/routines" component={RoutinesPage} />
          <Route path="/routines/builder" component={RoutineBuilderPage} />
          <Route path="/exercises" component={ExercisesPage} />
          <Route path="/exercises/:id" component={ExerciseDetailPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/body" component={BodyPage} />
          <Route path="/tools" component={ToolsPage} />
          <Route path="/tools/plate-calculator" component={PlateCalculatorPage} />
          <Route path="/tools/import-hevy" component={HevyImportPage} />
          <Route path="*" component={() => <Navigate href="/" />} />
        </Show>
      </Router>
    </Show>
  )
}

export default App
