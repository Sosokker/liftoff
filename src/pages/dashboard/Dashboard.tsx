import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useAuth } from '../../stores/authStore'
import { apiFetch } from '../../stores/authStore'
import { 
  Dumbbell, 
  Clock, 
  Calendar, 
  Flame,
  ChevronRight,
  Play,
  Wrench,
  User
} from 'lucide-solid'

interface DashboardStats {
  totalWorkouts: number
  thisWeekWorkouts: number
  currentStreak: number
  totalVolume: number
  recentWorkouts: any[]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = createSignal<DashboardStats>({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    currentStreak: 0,
    totalVolume: 0,
    recentWorkouts: []
  })
  const [isLoading, setIsLoading] = createSignal(true)

  createEffect(async () => {
    if (!user()) {
      navigate('/login')
      return
    }
    
    try {
      const [workoutsRes, streakRes] = await Promise.all([
        apiFetch('/api/workouts?limit=5'),
        apiFetch('/api/analytics/streak')
      ])

      const totalVolume = workoutsRes.reduce((sum: number, w: any) => {
        return sum + (parseFloat(w.total_volume) || 0)
      }, 0)

      // Calculate this week
      const now = new Date()
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      const thisWeek = workoutsRes.filter((w: any) => 
        new Date(w.start_time) >= weekStart
      )

      setStats({
        totalWorkouts: workoutsRes.length,
        thisWeekWorkouts: thisWeek.length,
        currentStreak: streakRes.currentStreak || 0,
        totalVolume: Math.round(totalVolume),
        recentWorkouts: workoutsRes.slice(0, 3)
      })
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <div class="px-4 py-6 space-y-6">
      {/* Welcome */}
      <div>
        <h2 class="text-2xl font-bold">
          Hello, {user()?.username || 'Athlete'}! 👋
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mt-1">
          Ready to crush your goals today?
        </p>
      </div>

      {/* Quick Actions */}
      <div class="grid grid-cols-2 gap-3">
        <button 
          onClick={() => navigate('/workout')}
          class="card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Play class="w-5 h-5 text-primary" />
          </div>
          <p class="font-semibold text-sm">Start Workout</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Empty or routine</p>
        </button>
        <button 
          onClick={() => navigate('/routines')}
          class="card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <div class="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center mb-3">
            <Dumbbell class="w-5 h-5 text-accent" />
          </div>
          <p class="font-semibold text-sm">Routines</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Your templates</p>
        </button>
        <button 
          onClick={() => navigate('/tools')}
          class="card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-3">
            <Wrench class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p class="font-semibold text-sm">Tools</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Import, calc, export</p>
        </button>
        <button 
          onClick={() => navigate('/body')}
          class="card p-4 text-left active:scale-[0.98] transition-transform"
        >
          <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3">
            <User class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p class="font-semibold text-sm">Body</p>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Measurements</p>
        </button>
      </div>

      {/* Stats Overview */}
      <div>
        <h3 class="text-lg font-semibold mb-3">This Week</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-1">
              <Calendar class="w-4 h-4 text-primary" />
              <span class="text-xs font-medium text-primary">Workouts</span>
            </div>
            <p class="text-2xl font-bold">{stats().thisWeekWorkouts}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">this week</p>
          </div>
          <div class="stat-card">
            <div class="flex items-center gap-2 mb-1">
              <Flame class="w-4 h-4 text-accent" />
              <span class="text-xs font-medium text-accent">Streak</span>
            </div>
            <p class="text-2xl font-bold">{stats().currentStreak}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">days</p>
          </div>
        </div>
      </div>

      {/* Recent Workouts */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">Recent Workouts</h3>
          <button 
            onClick={() => navigate('/workout/history')}
            class="text-sm text-primary font-medium flex items-center gap-0.5"
          >
            View all <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <Show when={!isLoading()} fallback={
          <div class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        }>
          <Show when={stats().recentWorkouts.length > 0} fallback={
            <div class="card p-6 text-center">
              <Dumbbell class="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p class="text-sm text-neutral-500 dark:text-neutral-400">No workouts yet</p>
              <button 
                onClick={() => navigate('/workout')}
                class="text-primary font-medium text-sm mt-2"
              >
                Start your first workout
              </button>
            </div>
          }>
            <div class="space-y-2">
              <For each={stats().recentWorkouts}>
                {(workout) => (
                  <button 
                    onClick={() => navigate(`/workout/history`)}
                    class="card p-4 w-full text-left active:bg-neutral-50 dark:active:bg-dark-surface transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="font-semibold">{workout.name}</p>
                        <div class="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <span class="flex items-center gap-1">
                            <Calendar class="w-3 h-3" />
                            {new Date(workout.start_time).toLocaleDateString()}
                          </span>
                          <Show when={workout.duration_seconds}>
                            <span class="flex items-center gap-1">
                              <Clock class="w-3 h-3" />
                              {Math.floor(workout.duration_seconds / 60)}m
                            </span>
                          </Show>
                        </div>
                      </div>
                      <ChevronRight class="w-5 h-5 text-neutral-400" />
                    </div>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  )
}
