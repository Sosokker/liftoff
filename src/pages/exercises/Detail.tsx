import { createSignal, createEffect, Show, For } from 'solid-js'
import { useParams, useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { ArrowLeft, TrendingUp, Dumbbell, Calendar } from 'lucide-solid'

export default function ExerciseDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const [exercise, setExercise] = createSignal<any>(null)
  const [history, setHistory] = createSignal<any[]>([])
  const [isLoading, setIsLoading] = createSignal(true)

  createEffect(async () => {
    try {
      const [exData, histData] = await Promise.all([
        apiFetch(`/api/exercises/${params.id}`),
        apiFetch(`/api/workouts/history/exercise/${params.id}?limit=10`)
      ])
      setExercise(exData)
      setHistory(histData)
    } catch (error) {
      console.error('Failed to load exercise:', error)
    } finally {
      setIsLoading(false)
    }
  })

  // Calculate stats
  const maxWeight = () => {
    const weights = history().filter(h => h.weight).map(h => parseFloat(h.weight))
    return weights.length > 0 ? Math.max(...weights) : 0
  }

  const totalSets = () => history().length

  return (
    <div class="px-4 py-6">
      <button 
        onClick={() => navigate('/exercises')}
        class="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 mb-4"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to exercises
      </button>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Show when={exercise()}>
          <div class="space-y-6">
            {/* Header */}
            <div>
              <h1 class="text-2xl font-bold">{exercise().name}</h1>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {exercise().muscle_group}
                </span>
                <Show when={exercise().equipment}>
                  <span class="text-sm bg-neutral-100 dark:bg-dark-surface text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full">
                    {exercise().equipment}
                  </span>
                </Show>
              </div>
            </div>

            {/* Stats Cards */}
            <div class="grid grid-cols-3 gap-3">
              <div class="stat-card p-3">
                <div class="flex items-center gap-1.5 mb-1">
                  <TrendingUp class="w-3.5 h-3.5 text-primary" />
                  <span class="text-[10px] font-medium text-primary">Max</span>
                </div>
                <p class="text-lg font-bold">{maxWeight()}</p>
                <p class="text-[10px] text-neutral-500 dark:text-neutral-400">kg/lbs</p>
              </div>
              <div class="stat-card p-3">
                <div class="flex items-center gap-1.5 mb-1">
                  <Dumbbell class="w-3.5 h-3.5 text-primary" />
                  <span class="text-[10px] font-medium text-primary">Sets</span>
                </div>
                <p class="text-lg font-bold">{totalSets()}</p>
                <p class="text-[10px] text-neutral-500 dark:text-neutral-400">logged</p>
              </div>
              <div class="stat-card p-3">
                <div class="flex items-center gap-1.5 mb-1">
                  <Calendar class="w-3.5 h-3.5 text-primary" />
                  <span class="text-[10px] font-medium text-primary">Recent</span>
                </div>
                <p class="text-lg font-bold">{history().length}</p>
                <p class="text-[10px] text-neutral-500 dark:text-neutral-400">records</p>
              </div>
            </div>

            {/* Instructions */}
            <Show when={exercise().instructions}>
              <div class="card p-4">
                <h3 class="font-semibold mb-2">Instructions</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {exercise().instructions}
                </p>
              </div>
            </Show>

            {/* Recent History */}
            <div>
              <h3 class="font-semibold mb-3">Recent Performance</h3>
              <Show when={history().length > 0} fallback={
                <p class="text-sm text-neutral-500 dark:text-neutral-400">No history yet</p>
              }>
                <div class="space-y-2">
                  <For each={history()}>
                    {(h) => (
                      <div class="card p-3 flex items-center justify-between">
                        <div>
                          <p class="text-xs text-neutral-500 dark:text-neutral-400">
                            {new Date(h.start_time).toLocaleDateString()}
                          </p>
                          <p class="text-sm font-medium mt-0.5">
                            {h.weight || '-'} × {h.reps || '-'} @ RPE {h.rpe || '-'}
                          </p>
                        </div>
                        <span class={`text-xs px-2 py-0.5 rounded-full ${
                          h.set_type === 'warmup' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                          h.set_type === 'failure' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                          'bg-neutral-100 text-neutral-700 dark:bg-dark-surface'
                        }`}>
                          {h.set_type}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  )
}
