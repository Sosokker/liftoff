import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Plus, X, GripVertical, Save, Trash2 } from 'lucide-solid'

interface ExerciseDef {
  id: number
  name: string
  muscle_group: string
  equipment?: string
}

interface RoutineExerciseDef {
  id?: number
  exercise_id: number
  name: string
  muscle_group: string
  order_index: number
  target_sets: number
  target_reps: number
  rest_seconds: number
}

export default function RoutineBuilderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const routineId = searchParams.id
  
  const [name, setName] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [exercises, setExercises] = createSignal<RoutineExerciseDef[]>([])
  const [availableExercises, setAvailableExercises] = createSignal<ExerciseDef[]>([])
  const [showPicker, setShowPicker] = createSignal(false)
  const [isLoading, setIsLoading] = createSignal(false)
  const [isSaving, setIsSaving] = createSignal(false)

  createEffect(async () => {
    try {
      const data = await apiFetch('/api/exercises')
      setAvailableExercises(data)
    } catch (error) {
      console.error('Failed to load exercises:', error)
    }
  })

  // Load existing routine if editing
  createEffect(async () => {
    if (routineId) {
      setIsLoading(true)
      try {
        const data = await apiFetch(`/api/routines/${routineId}`)
        setName(data.name)
        setDescription(data.description || '')
        if (data.exercises) {
          setExercises(data.exercises.map((ex: any) => ({
            id: ex.id,
            exercise_id: ex.exercise_id,
            name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            order_index: ex.order_index,
            target_sets: ex.target_sets || 3,
            target_reps: ex.target_reps || 10,
            rest_seconds: ex.rest_seconds || 60
          })))
        }
      } catch (error) {
        console.error('Failed to load routine:', error)
      } finally {
        setIsLoading(false)
      }
    }
  })

  function addExercise(exercise: ExerciseDef) {
    const newEx: RoutineExerciseDef = {
      exercise_id: exercise.id,
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      order_index: exercises().length,
      target_sets: 3,
      target_reps: 10,
      rest_seconds: 60
    }
    setExercises([...exercises(), newEx])
    setShowPicker(false)
  }

  function removeExercise(index: number) {
    const updated = exercises().filter((_, i) => i !== index)
    updated.forEach((ex, i) => ex.order_index = i)
    setExercises(updated)
  }

  function updateExercise(index: number, field: keyof RoutineExerciseDef, value: any) {
    const updated = [...exercises()]
    updated[index] = { ...updated[index], [field]: value }
    setExercises(updated)
  }

  async function saveRoutine() {
    if (!name()) {
      alert('Please enter a routine name')
      return
    }

    if (exercises().length === 0) {
      alert('Please add at least one exercise')
      return
    }

    setIsSaving(true)

    const payload = {
      name: name(),
      description: description(),
      exercises: exercises().map(ex => ({
        exercise_id: ex.exercise_id,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        rest_seconds: ex.rest_seconds
      }))
    }

    try {
      if (routineId) {
        await apiFetch(`/api/routines/${routineId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      } else {
        await apiFetch('/api/routines', {
          method: 'POST',
          body: JSON.stringify(payload)
        })
      }
      navigate('/routines')
    } catch (error: any) {
      alert(error.message || 'Failed to save routine')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteRoutine() {
    if (!routineId) return
    if (!confirm('Delete this routine?')) return
    
    try {
      await apiFetch(`/api/routines/${routineId}`, { method: 'DELETE' })
      navigate('/routines')
    } catch (error) {
      console.error('Failed to delete routine:', error)
    }
  }

  return (
    <div class="px-4 py-6 space-y-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xl font-bold">
          {routineId ? 'Edit Routine' : 'New Routine'}
        </h2>
        <div class="flex items-center gap-2">
          <Show when={routineId}>
            <button 
              onClick={deleteRoutine}
              class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
            >
              <Trash2 class="w-5 h-5 text-red-500" />
            </button>
          </Show>
          <button 
            onClick={saveRoutine}
            disabled={isSaving()}
            class="btn-primary py-2 px-4 text-sm flex items-center gap-1"
          >
            <Save class="w-4 h-4" />
            {isSaving() ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <Show when={isLoading()}>
        <div class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </Show>

      <Show when={!isLoading()}>
        {/* Routine Info */}
        <div class="card p-4 space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1.5">Routine Name *</label>
            <input
              type="text"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              class="input"
              placeholder="e.g., Push Day A"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              class="input text-sm"
              placeholder="Optional description..."
              rows={2}
            />
          </div>
        </div>

        {/* Exercises */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Exercises</h3>
            <span class="text-sm text-neutral-500 text-neutral-400">{exercises().length} total</span>
          </div>

          <For each={exercises()}>
            {(exercise, index) => (
              <div class="card p-4">
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <GripVertical class="w-4 h-4 text-neutral-400" />
                    <div>
                      <h4 class="font-semibold">{exercise.name}</h4>
                      <p class="text-xs text-neutral-500 text-neutral-400">{exercise.muscle_group}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeExercise(index())}
                    class="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <X class="w-4 h-4 text-red-500" />
                  </button>
                </div>
                
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-xs text-neutral-500 text-neutral-400 mb-1 block">Sets</label>
                    <input
                      type="number"
                      value={exercise.target_sets}
                      onInput={(e) => updateExercise(index(), 'target_sets', parseInt(e.currentTarget.value) || 0)}
                      class="input py-2 text-sm text-center"
                      min="1"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-500 text-neutral-400 mb-1 block">Reps</label>
                    <input
                      type="number"
                      value={exercise.target_reps}
                      onInput={(e) => updateExercise(index(), 'target_reps', parseInt(e.currentTarget.value) || 0)}
                      class="input py-2 text-sm text-center"
                      min="1"
                    />
                  </div>
                  <div>
                    <label class="text-xs text-neutral-500 text-neutral-400 mb-1 block">Rest (s)</label>
                    <input
                      type="number"
                      value={exercise.rest_seconds}
                      onInput={(e) => updateExercise(index(), 'rest_seconds', parseInt(e.currentTarget.value) || 0)}
                      class="input py-2 text-sm text-center"
                      min="0"
                      step="15"
                    />
                  </div>
                </div>
              </div>
            )}
          </For>

          <button 
            onClick={() => setShowPicker(true)}
            class="w-full py-4 border-2 border-dashed border-[#333] border-[#262626] rounded-xl text-neutral-500 text-neutral-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus class="w-5 h-5" />
            <span class="font-medium">Add Exercise</span>
          </button>
        </div>
      </Show>

      {/* Exercise Picker */}
      <Show when={showPicker()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowPicker(false)}>
          <div class="bottom-sheet w-full max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <div class="p-4 border-b border-[#262626] border-[#262626]">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg">Add Exercise</h3>
                <button onClick={() => setShowPicker(false)}>
                  <X class="w-5 h-5" />
                </button>
              </div>
            </div>
            <div class="p-4 space-y-2 overflow-auto max-h-[50vh]">
              <For each={availableExercises()}>
                {(exercise) => (
                  <button 
                    onClick={() => addExercise(exercise)}
                    class="exercise-card w-full text-left"
                  >
                    <p class="font-medium">{exercise.name}</p>
                    <p class="text-xs text-neutral-500 text-neutral-400">{exercise.muscle_group}</p>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
