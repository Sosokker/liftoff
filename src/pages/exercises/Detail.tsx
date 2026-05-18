import { createSignal, createEffect, Show, For } from 'solid-js'
import { useParams, useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { ArrowLeft, TrendingUp, Dumbbell, Calendar, BarChart3 } from 'lucide-solid'

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

  // Group history by workout date and find max weight per session
  const chartData = () => {
    const sessions = new Map<string, number>()
    for (const h of history()) {
      const date = new Date(h.start_time).toISOString().split('T')[0]
      const w = parseFloat(h.weight) || 0
      if (w > 0) {
        sessions.set(date, Math.max(sessions.get(date) || 0, w))
      }
    }
    return Array.from(sessions.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // last 12 sessions
  }

  function renderChart() {
    const data = chartData()
    if (data.length < 2) return null

    const width = 300
    const height = 120
    const padding = { top: 10, right: 10, bottom: 20, left: 30 }
    const innerW = width - padding.left - padding.right
    const innerH = height - padding.top - padding.bottom

    const maxW = Math.max(...data.map(d => d[1]), 1)
    const minW = Math.min(...data.map(d => d[1]), 0)
    const range = maxW - minW || 1

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * innerW
      const y = padding.top + innerH - ((d[1] - minW) / range) * innerH
      return { x, y, date: d[0], value: d[1] }
    })

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`

    return (
      <svg viewBox={`0 0 ${width} ${height}`} class="w-full h-32">
        {/* Y-axis grid */}
        <For each={[0, 0.33, 0.66, 1]}>
          {(t) => {
            const y = padding.top + innerH * (1 - t)
            const val = Math.round(minW + range * t)
            return (
              <g>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2" />
                <text x={padding.left - 5} y={y + 3} text-anchor="end" class="text-[8px] fill-current opacity-40">{val}</text>
              </g>
            )
          }}
        </For>
        {/* Area */}
        <path d={areaD} class="fill-primary/10" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="currentColor" stroke-width="2" class="text-primary" />
        {/* Points */}
        <For each={points}>
          {(p) => (
            <circle cx={p.x} cy={p.y} r="3" class="fill-primary" />
          )}
        </For>
        {/* X-axis labels (first, middle, last) */}
        <text x={points[0].x} y={height - 2} text-anchor="start" class="text-[8px] fill-current opacity-40">{points[0].date.slice(5)}</text>
        <text x={points[points.length - 1].x} y={height - 2} text-anchor="end" class="text-[8px] fill-current opacity-40">{points[points.length - 1].date.slice(5)}</text>
      </svg>
    )
  }

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

            {/* Progress Chart */}
            <Show when={chartData().length >= 2}>
              <div class="card p-4">
                <div class="flex items-center gap-2 mb-3">
                  <BarChart3 class="w-4 h-4 text-primary" />
                  <h3 class="font-semibold">Weight Progress</h3>
                </div>
                {renderChart()}
              </div>
            </Show>

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
