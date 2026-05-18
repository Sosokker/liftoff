import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Plus, Dumbbell, List, Play, Pencil } from 'lucide-solid'

interface RoutineWithCount {
  id: number
  name: string
  description?: string
  exercise_count?: number
}

export default function RoutinesPage() {
  const navigate = useNavigate()
  const [routines, setRoutines] = createSignal<RoutineWithCount[]>([])
  const [isLoading, setIsLoading] = createSignal(true)

  createEffect(async () => {
    try {
      const data = await apiFetch('/api/routines')
      setRoutines(data)
    } catch (error) {
      console.error('Failed to load routines:', error)
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <div class="px-4 py-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold">My Routines</h2>
        <button 
          onClick={() => navigate('/routines/builder')}
          class="btn-primary py-2 px-4 text-sm flex items-center gap-1"
        >
          <Plus class="w-4 h-4" />
          New
        </button>
      </div>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Show when={routines().length > 0} fallback={
          <div class="card p-8 text-center">
            <List class="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p class="text-neutral-400 mb-2">No routines yet</p>
            <button 
              onClick={() => navigate('/routines/builder')}
              class="text-primary font-medium"
            >
              Create your first routine
            </button>
          </div>
        }>
          <div class="space-y-3">
            <For each={routines()}>
              {(routine) => (
                <div class="card p-4 w-full text-left">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Dumbbell class="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 class="font-semibold">{routine.name}</h3>
                        <p class="text-xs text-neutral-400">
                          {routine.exercise_count || 0} exercises
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/workout?routineId=${routine.id}`)}
                        class="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                        title="Start workout"
                      >
                        <Play class="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/routines/builder?id=${routine.id}`)}
                        class="p-2 hover:bg-[#1a1a1a] rounded-xl transition-colors"
                        title="Edit routine"
                      >
                        <Pencil class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <Show when={routine.description}>
                    <p class="text-sm text-neutral-400 mt-2 ml-14">
                      {routine.description}
                    </p>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  )
}
