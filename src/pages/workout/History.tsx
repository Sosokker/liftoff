import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Calendar, Clock, Trash2, Dumbbell, BookmarkPlus, Loader2 } from 'lucide-solid'

export default function WorkoutHistoryPage() {
  const navigate = useNavigate()
  const [workouts, setWorkouts] = createSignal<any[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [savingWorkoutId, setSavingWorkoutId] = createSignal<number | null>(null)

  createEffect(async () => {
    try {
      const data = await apiFetch('/api/workouts?limit=50')
      setWorkouts(data)
    } catch (error) {
      console.error('Failed to load workouts:', error)
    } finally {
      setIsLoading(false)
    }
  })

  async function deleteWorkout(id: number) {
    if (!confirm('Delete this workout?')) return

    try {
      await apiFetch(`/api/workouts/${id}`, { method: 'DELETE' })
      setWorkouts(workouts().filter(w => w.id !== id))
    } catch (error) {
      console.error('Failed to delete workout:', error)
    }
  }

  async function saveWorkoutAsRoutine(workout: any) {
    setSavingWorkoutId(Number(workout.id))
    try {
      const result = await apiFetch(`/api/workouts/${workout.id}/save-as-routine`, {
        method: 'POST',
        body: JSON.stringify({})
      })
      alert(`Routine "${result.name}" saved!`)
    } catch (err: any) {
      alert(err.message || 'Failed to save routine')
    } finally {
      setSavingWorkoutId(null)
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  function formatDuration(seconds?: number) {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div class="px-4 py-6">
      <h2 class="text-xl font-bold mb-4">Workout History</h2>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Show when={workouts().length > 0} fallback={
          <div class="card p-8 text-center">
            <Dumbbell class="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
            <p class="text-neutral-500 dark:text-neutral-400 mb-2">No workouts yet</p>
            <button 
              onClick={() => navigate('/workout')}
              class="text-primary font-medium"
            >
              Start your first workout
            </button>
          </div>
        }>
          <div class="space-y-3">
            <For each={workouts()}>
              {(workout) => (
                <div class="card overflow-hidden">
                  <div class="p-4">
                    <div class="flex items-start justify-between mb-3">
                      <div>
                        <h3 class="font-semibold">{workout.name}</h3>
                        <div class="flex items-center gap-3 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <span class="flex items-center gap-1">
                            <Calendar class="w-3 h-3" />
                            {formatDate(workout.start_time)}
                          </span>
                          <Show when={workout.duration_seconds}>
                            <span class="flex items-center gap-1">
                              <Clock class="w-3 h-3" />
                              {formatDuration(workout.duration_seconds)}
                            </span>
                          </Show>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <button
                          onClick={() => saveWorkoutAsRoutine(workout)}
                          disabled={savingWorkoutId() === Number(workout.id)}
                          class="p-2 hover:bg-primary/10 rounded-lg transition-colors"
                          title="Save as Routine"
                        >
                          <Show when={savingWorkoutId() === Number(workout.id)} fallback={
                            <BookmarkPlus class="w-4 h-4 text-primary" />
                          }>
                            <Loader2 class="w-4 h-4 text-primary animate-spin" />
                          </Show>
                        </button>
                        <button
                          onClick={() => deleteWorkout(Number(workout.id))}
                          class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 class="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-4 text-sm">
                      <span class="text-neutral-600 dark:text-neutral-300">
                        {workout.exercise_count || 0} exercises
                      </span>
                      <span class="text-neutral-600 dark:text-neutral-300">
                        {workout.completed_sets || 0} sets
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  )
}
