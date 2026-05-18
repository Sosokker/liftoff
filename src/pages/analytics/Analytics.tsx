import { createSignal, createEffect, Show, For } from 'solid-js'
import { apiFetch } from '../../stores/authStore'
import { Dumbbell, Flame } from 'lucide-solid'

export default function AnalyticsPage() {
  const [volumeData, setVolumeData] = createSignal<any[]>([])
  const [muscleData, setMuscleData] = createSignal<any[]>([])
  const [strengthData, setStrengthData] = createSignal<any[]>([])
  const [streakData, setStreakData] = createSignal({ currentStreak: 0, totalWorkouts: 0 })
  const [period, setPeriod] = createSignal('30d')
  const [isLoading, setIsLoading] = createSignal(true)
  const [calendarData, setCalendarData] = createSignal<any[]>([])

  createEffect(async () => {
    setIsLoading(true)
    try {
      const [volume, muscles, strength, streak, calendar] = await Promise.all([
        apiFetch(`/api/analytics/volume?period=${period()}`),
        apiFetch(`/api/analytics/muscles?period=${period()}`),
        apiFetch('/api/analytics/strength-levels'),
        apiFetch('/api/analytics/streak'),
        apiFetch(`/api/analytics/calendar?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`)
      ])
      
      setVolumeData(volume)
      setMuscleData(muscles)
      setStrengthData(strength)
      setStreakData(streak)
      setCalendarData(calendar)
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setIsLoading(false)
    }
  })

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '3 Months' },
    { value: '1y', label: '1 Year' }
  ]

  // Simple bar chart using CSS
  const maxVolume = () => {
    const max = Math.max(...volumeData().map(d => parseFloat(d.volume) || 0), 1)
    return max
  }

  const maxMuscle = () => {
    const max = Math.max(...muscleData().map(d => parseFloat(d.set_count) || 0), 1)
    return max
  }

  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay()

  function getWorkoutCount(day: number) {
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const entry = calendarData().find(c => c.date === dateStr)
    return entry ? parseInt(entry.workout_count) : 0
  }

  return (
    <div class="px-4 py-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Analytics</h2>
        <div class="flex gap-1">
          <For each={periods}>
            {(p) => (
              <button
                onClick={() => setPeriod(p.value)}
                class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period() === p.value
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 dark:bg-dark-surface text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {p.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        {/* Quick Stats */}
        <div class="grid grid-cols-2 gap-3">
          <div class="stat-card p-4">
            <div class="flex items-center gap-2 mb-1">
              <Flame class="w-4 h-4 text-accent" />
              <span class="text-xs font-medium text-accent">Current Streak</span>
            </div>
            <p class="text-2xl font-bold">{streakData().currentStreak}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">days</p>
          </div>
          <div class="stat-card p-4">
            <div class="flex items-center gap-2 mb-1">
              <Dumbbell class="w-4 h-4 text-primary" />
              <span class="text-xs font-medium text-primary">Total Workouts</span>
            </div>
            <p class="text-2xl font-bold">{streakData().totalWorkouts}</p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">lifetime</p>
          </div>
        </div>

        {/* Volume Chart */}
        <div>
          <h3 class="font-semibold mb-3">Volume Over Time</h3>
          <Show when={volumeData().length > 0} fallback={
            <p class="text-sm text-neutral-500 dark:text-neutral-400">No data for this period</p>
          }>
            <div class="card p-4">
              <div class="flex items-end gap-1 h-32">
                <For each={volumeData()}>
                  {(day) => (
                    <div class="flex-1 flex flex-col items-center gap-1">
                      <div 
                        class="w-full bg-primary/80 rounded-t-sm min-h-[2px]"
                        style={`height: ${((parseFloat(day.volume) || 0) / maxVolume()) * 100}%`}
                      />
                      <span class="text-[8px] text-neutral-400 rotate-0">
                        {new Date(day.date).getDate()}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        {/* Muscle Distribution */}
        <div>
          <h3 class="font-semibold mb-3">Muscle Group Distribution</h3>
          <Show when={muscleData().length > 0} fallback={
            <p class="text-sm text-neutral-500 dark:text-neutral-400">No data for this period</p>
          }>
            <div class="card p-4 space-y-3">
              <For each={muscleData()}>
                {(muscle) => (
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium">{muscle.muscle_group}</span>
                      <span class="text-xs text-neutral-500 dark:text-neutral-400">
                        {muscle.set_count} sets
                      </span>
                    </div>
                    <div class="w-full bg-neutral-100 dark:bg-dark-surface rounded-full h-2">
                      <div 
                        class="bg-primary rounded-full h-2 transition-all"
                        style={`width: ${((parseFloat(muscle.set_count) || 0) / maxMuscle()) * 100}%`}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* Strength Levels */}
        <div>
          <h3 class="font-semibold mb-3">Strength Levels (Big 3)</h3>
          <div class="card p-4 space-y-3">
            <For each={strengthData()}>
              {(level) => (
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">{level.exercise}</p>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">
                      {level.maxWeight > 0 ? `${level.maxWeight} kg/lbs` : 'No data'}
                    </p>
                  </div>
                  <Show when={level.maxWeight > 0}>
                    <div class="text-right">
                      <span class={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        level.maxWeight > 100 
                          ? 'bg-primary/10 text-primary' 
                          : level.maxWeight > 60 
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-neutral-100 text-neutral-700 dark:bg-dark-surface'
                      }`}>
                        {level.maxWeight > 120 ? 'Elite' : 
                         level.maxWeight > 100 ? 'Advanced' : 
                         level.maxWeight > 60 ? 'Intermediate' : 'Beginner'}
                      </span>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Training Calendar */}
        <div>
          <h3 class="font-semibold mb-3">Training Calendar</h3>
          <div class="card p-4">
            <div class="grid grid-cols-7 gap-1 text-center mb-2">
              <span class="text-xs text-neutral-400">S</span>
              <span class="text-xs text-neutral-400">M</span>
              <span class="text-xs text-neutral-400">T</span>
              <span class="text-xs text-neutral-400">W</span>
              <span class="text-xs text-neutral-400">T</span>
              <span class="text-xs text-neutral-400">F</span>
              <span class="text-xs text-neutral-400">S</span>
            </div>
            <div class="grid grid-cols-7 gap-1">
              {/* Empty cells for first day offset */}
              <For each={Array(firstDayOfMonth).fill(0)}>
                {() => <div class="aspect-square" />}
              </For>
              
              <For each={Array(daysInMonth).fill(0).map((_, i) => i + 1)}>
                {(day) => {
                  const count = getWorkoutCount(day)
                  return (
                    <div class={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${
                      count > 0 
                        ? 'bg-primary text-white' 
                        : 'bg-neutral-50 dark:bg-dark-surface text-neutral-400'
                    }`}>
                      {day}
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
