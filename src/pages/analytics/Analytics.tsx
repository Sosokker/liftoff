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

  createEffect(async () => {
    setIsLoading(true)
    try {
      const [volume, muscles, strength, streak] = await Promise.all([
        apiFetch(`/api/analytics/volume?period=${period()}`),
        apiFetch(`/api/analytics/muscles?period=${period()}`),
        apiFetch('/api/analytics/strength-levels'),
        apiFetch('/api/analytics/streak')
      ])

      setVolumeData(volume)
      setMuscleData(muscles)
      setStrengthData(strength)
      setStreakData(streak)
    } catch (error) {
      console.error('Analytics error:', error)
    } finally {
      setIsLoading(false)
    }
  })

  const periods = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '1y', label: '1y' }
  ]

  const maxVolume = () => {
    const max = Math.max(...volumeData().map(d => parseFloat(d.volume) || 0), 1)
    return max
  }

  const maxMuscle = () => {
    const max = Math.max(...muscleData().map(d => parseFloat(d.set_count) || 0), 1)
    return max
  }

  return (
    <div class="px-4 py-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Stats</h2>
        <div class="flex gap-1.5">
          <For each={periods}>
            {(p) => (
              <button
                onClick={() => setPeriod(p.value)}
                class={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  period() === p.value
                    ? 'bg-white text-black'
                    : 'bg-[#1f1f1f] text-neutral-400 border border-[#333]'
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
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      }>
        {/* Quick Stats */}
        <div class="grid grid-cols-2 gap-3">
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-2">
              <Flame class="w-4 h-4 text-[#ff6b6b]" />
              <span class="text-xs text-neutral-500">Current Streak</span>
            </div>
            <p class="text-2xl font-bold">{streakData().currentStreak}</p>
            <p class="text-xs text-neutral-500">days</p>
          </div>
          <div class="card p-4">
            <div class="flex items-center gap-2 mb-2">
              <Dumbbell class="w-4 h-4 text-white" />
              <span class="text-xs text-neutral-500">Total Workouts</span>
            </div>
            <p class="text-2xl font-bold">{streakData().totalWorkouts}</p>
            <p class="text-xs text-neutral-500">lifetime</p>
          </div>
        </div>

        {/* Volume Chart */}
        <div>
          <h3 class="font-semibold mb-3 text-sm">Volume</h3>
          <Show when={volumeData().length > 0} fallback={
            <p class="text-sm text-neutral-500">No data for this period</p>
          }>
            <div class="card p-4">
              <div class="flex items-end gap-[2px] h-32">
                <For each={volumeData()}>
                  {(day) => (
                    <div class="flex-1 flex flex-col items-center gap-1">
                      <div
                        class="w-full bg-white/20 rounded-t-sm min-h-[2px] hover:bg-white/40 transition-colors"
                        style={`height: ${((parseFloat(day.volume) || 0) / maxVolume()) * 100}%`}
                      />
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        {/* Muscle Distribution */}
        <div>
          <h3 class="font-semibold mb-3 text-sm">Muscle Groups</h3>
          <Show when={muscleData().length > 0} fallback={
            <p class="text-sm text-neutral-500">No data for this period</p>
          }>
            <div class="card p-4 space-y-3">
              <For each={muscleData()}>
                {(muscle) => (
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-sm font-medium">{muscle.muscle_group}</span>
                      <span class="text-xs text-neutral-500">
                        {muscle.set_count} sets
                      </span>
                    </div>
                    <div class="w-full bg-[#262626] rounded-full h-1.5">
                      <div
                        class="bg-white rounded-full h-1.5 transition-all"
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
          <h3 class="font-semibold mb-3 text-sm">Strength</h3>
          <div class="card p-4 space-y-3">
            <For each={strengthData()}>
              {(level) => (
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-sm">{level.exercise}</p>
                    <p class="text-xs text-neutral-500">
                      {level.maxWeight > 0 ? `${level.maxWeight} kg` : 'No data'}
                    </p>
                  </div>
                  <Show when={level.maxWeight > 0}>
                    <span class={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      level.maxWeight > 120
                        ? 'bg-white/10 text-white'
                        : level.maxWeight > 100
                          ? 'bg-white/5 text-neutral-300'
                          : 'bg-[#1f1f1f] text-neutral-500'
                    }`}>
                      {level.maxWeight > 120 ? 'Elite' :
                       level.maxWeight > 100 ? 'Advanced' :
                       level.maxWeight > 60 ? 'Intermediate' : 'Beginner'}
                    </span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  )
}
