import { createSignal, createEffect, Show, For, onCleanup } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { 
  Play, 
  Check, 
  Plus, 
  Timer,
  X,
  Trash2
} from 'lucide-solid'

interface ExerciseDef {
  id: number
  name: string
  muscle_group: string
}

interface WorkoutSet {
  id?: number
  set_type: string
  set_number: number
  reps: number
  weight: number
  rpe: number
  is_completed: boolean
  completed_at?: string
}

interface ActiveExercise {
  id?: number
  exercise_id: number
  exercise_name: string
  muscle_group: string
  order_index: number
  notes: string
  sets: WorkoutSet[]
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const [isActive, setIsActive] = createSignal(false)
  const [workoutName, setWorkoutName] = createSignal('')
  const [startTime, setStartTime] = createSignal<Date | null>(null)
  const [elapsed, setElapsed] = createSignal(0)
  const [exercises, setExercises] = createSignal<ActiveExercise[]>([])
  const [showExercisePicker, setShowExercisePicker] = createSignal(false)
  const [availableExercises, setAvailableExercises] = createSignal<ExerciseDef[]>([])
  const [restTimer, setRestTimer] = createSignal(0)
  const [isResting, setIsResting] = createSignal(false)
  const [restInterval, setRestInterval] = createSignal<number | null>(null)
  const [workoutNotes, setWorkoutNotes] = createSignal('')
  const [showFinishConfirm, setShowFinishConfirm] = createSignal(false)

  let timerInterval: number | null = null

  // Load exercises
  createEffect(async () => {
    try {
      const data = await apiFetch('/api/exercises')
      setAvailableExercises(data)
    } catch (error) {
      console.error('Failed to load exercises:', error)
    }
  })

  // Timer
  createEffect(() => {
    if (isActive() && startTime()) {
      timerInterval = window.setInterval(() => {
        if (startTime()) {
          setElapsed(Math.floor((Date.now() - startTime()!.getTime()) / 1000))
        }
      }, 1000)
    } else if (timerInterval) {
      clearInterval(timerInterval)
    }
    
    onCleanup(() => {
      if (timerInterval) clearInterval(timerInterval)
    })
  })

  // Rest timer
  createEffect(() => {
    if (isResting() && restTimer() > 0) {
      const interval = window.setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setRestInterval(interval)
    } else if (restInterval()) {
      clearInterval(restInterval()!)
      setRestInterval(null)
    }
    
    onCleanup(() => {
      if (restInterval()) clearInterval(restInterval()!)
    })
  })

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function startWorkout() {
    setIsActive(true)
    setStartTime(new Date())
    if (!workoutName()) {
      setWorkoutName('Quick Workout')
    }
  }

  function addExercise(exercise: ExerciseDef) {
    const newExercise: ActiveExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      order_index: exercises().length,
      notes: '',
      sets: [createSet(1)]
    }
    setExercises([...exercises(), newExercise])
    setShowExercisePicker(false)
  }

  function createSet(setNumber: number): WorkoutSet {
    // Try to get previous performance
    return {
      set_type: 'normal',
      set_number: setNumber,
      reps: 0,
      weight: 0,
      rpe: 0,
      is_completed: false
    }
  }

  function updateSet(exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) {
    const updated = [...exercises()]
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value
    }
    setExercises(updated)
  }

  function toggleSetComplete(exerciseIndex: number, setIndex: number) {
    const updated = [...exercises()]
    const set = updated[exerciseIndex].sets[setIndex]
    set.is_completed = !set.is_completed
    set.completed_at = set.is_completed ? new Date().toISOString() : undefined
    updated[exerciseIndex].sets[setIndex] = { ...set }
    setExercises(updated)
    
    if (set.is_completed) {
      startRestTimer()
    }
  }

  function addSet(exerciseIndex: number) {
    const updated = [...exercises()]
    const newSetNumber = updated[exerciseIndex].sets.length + 1
    updated[exerciseIndex].sets.push(createSet(newSetNumber))
    setExercises(updated)
  }

  function removeExercise(exerciseIndex: number) {
    const updated = exercises().filter((_, i) => i !== exerciseIndex)
    updated.forEach((ex, i) => ex.order_index = i)
    setExercises(updated)
  }

  function startRestTimer(seconds: number = 90) {
    setRestTimer(seconds)
    setIsResting(true)
  }

  function finishWorkout() {
    setShowFinishConfirm(true)
  }

  async function saveWorkout() {
    if (!startTime()) return
    
    const duration = Math.floor((Date.now() - startTime()!.getTime()) / 1000)
    
    const workoutData = {
      name: workoutName(),
      notes: workoutNotes(),
      duration_seconds: duration,
      exercises: exercises().map(ex => ({
        exercise_id: ex.exercise_id,
        notes: ex.notes,
        sets: ex.sets.map(s => ({
          set_type: s.set_type,
          set_number: s.set_number,
          reps: s.reps || null,
          weight: s.weight || null,
          rpe: s.rpe || null,
          is_completed: s.is_completed
        }))
      }))
    }
    
    try {
      await apiFetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workoutData)
      })
      
      // Reset state
      setIsActive(false)
      setStartTime(null)
      setElapsed(0)
      setExercises([])
      setWorkoutName('')
      setWorkoutNotes('')
      setShowFinishConfirm(false)
      
      navigate('/workout/history')
    } catch (error) {
      console.error('Failed to save workout:', error)
      alert('Failed to save workout. Please try again.')
    }
  }

  const setTypeColors: Record<string, string> = {
    warmup: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    normal: 'bg-neutral-100 text-neutral-700 dark:bg-dark-surface dark:text-neutral-300',
    drop_set: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    failure: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    superset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }

  return (
    <div class="px-4 py-6 space-y-4">
      {/* Workout Header */}
      <Show when={!isActive()}>
        <div class="text-center py-8">
          <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play class="w-8 h-8 text-primary ml-1" />
          </div>
          <h2 class="text-xl font-bold mb-2">Start Workout</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
            Log your training session and track your progress
          </p>
          
          <input
            type="text"
            value={workoutName()}
            onInput={(e) => setWorkoutName(e.currentTarget.value)}
            class="input mb-4 max-w-xs mx-auto"
            placeholder="Workout name (optional)"
          />
          
          <button onClick={startWorkout} class="btn-primary px-8">
            Start Empty Workout
          </button>
        </div>
      </Show>

      <Show when={isActive()}>
        {/* Active Workout Timer */}
        <div class="card p-4 flex items-center justify-between">
          <div>
            <input
              type="text"
              value={workoutName()}
              onInput={(e) => setWorkoutName(e.currentTarget.value)}
              class="font-semibold bg-transparent border-none focus:outline-none text-lg w-full"
            />
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              {formatTime(elapsed())}
            </p>
          </div>
          <button 
            onClick={finishWorkout}
            class="btn-primary text-sm py-2 px-4"
          >
            Finish
          </button>
        </div>

        {/* Rest Timer */}
        <Show when={isResting()}>
          <div class="card p-4 bg-primary/5 border-primary/20">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Timer class="w-5 h-5 text-primary" />
                <span class="font-semibold">Rest Timer</span>
              </div>
              <span class="text-2xl font-bold text-primary">{formatTime(restTimer())}</span>
            </div>
            <div class="flex gap-2 mt-3">
              <button onClick={() => setRestTimer(prev => prev + 30)} class="btn-secondary text-sm py-1.5 px-3 flex-1">
                +30s
              </button>
              <button onClick={() => setIsResting(false)} class="btn-secondary text-sm py-1.5 px-3 flex-1">
                Skip
              </button>
            </div>
          </div>
        </Show>

        {/* Exercises */}
        <div class="space-y-4">
          <For each={exercises()}>
            {(exercise, exerciseIndex) => (
              <div class="card overflow-visible">
                <div class="p-4 border-b border-neutral-100 dark:border-dark-border">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold">{exercise.exercise_name}</h3>
                      <p class="text-xs text-neutral-500 dark:text-neutral-400">{exercise.muscle_group}</p>
                    </div>
                    <button 
                      onClick={() => removeExercise(exerciseIndex())}
                      class="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 class="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div class="p-4 space-y-2">
                  {/* Set Header */}
                  <div class="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-neutral-500 dark:text-neutral-400 px-2">
                    <span>Set</span>
                    <span>KG</span>
                    <span>Reps</span>
                    <span>RPE</span>
                    <span>Type</span>
                    <span></span>
                  </div>

                  {/* Sets */}
                  <For each={exercise.sets}>
                    {(set, setIndex) => (
                      <div class={`set-row grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 items-center ${set.is_completed ? 'bg-primary/5' : ''}`}>
                        <span class="text-sm font-medium w-6">{set.set_number}</span>
                        
                        <input
                          type="number"
                          value={set.weight || ''}
                          onInput={(e) => updateSet(exerciseIndex(), setIndex(), 'weight', parseFloat(e.currentTarget.value) || 0)}
                          class="w-full bg-transparent border border-neutral-200 dark:border-dark-border rounded-lg px-2 py-1 text-sm text-center"
                          placeholder="0"
                          min="0"
                          step="0.5"
                        />
                        
                        <input
                          type="number"
                          value={set.reps || ''}
                          onInput={(e) => updateSet(exerciseIndex(), setIndex(), 'reps', parseInt(e.currentTarget.value) || 0)}
                          class="w-full bg-transparent border border-neutral-200 dark:border-dark-border rounded-lg px-2 py-1 text-sm text-center"
                          placeholder="0"
                          min="0"
                        />
                        
                        <select
                          value={set.rpe || ''}
                          onChange={(e) => updateSet(exerciseIndex(), setIndex(), 'rpe', parseInt(e.currentTarget.value) || 0)}
                          class="w-full bg-transparent border border-neutral-200 dark:border-dark-border rounded-lg px-1 py-1 text-sm text-center"
                        >
                          <option value="">-</option>
                          <For each={[6, 7, 7.5, 8, 8.5, 9, 9.5, 10]}>
                            {(rpe) => <option value={rpe}>{rpe}</option>}
                          </For>
                        </select>
                        
                        <select
                          value={set.set_type}
                          onChange={(e) => updateSet(exerciseIndex(), setIndex(), 'set_type', e.currentTarget.value)}
                          class={`text-xs px-1 py-1 rounded-md border-none ${setTypeColors[set.set_type] || setTypeColors.normal}`}
                        >
                          <option value="warmup">W</option>
                          <option value="normal">N</option>
                          <option value="drop_set">D</option>
                          <option value="failure">F</option>
                          <option value="superset">S</option>
                        </select>

                        <button
                          onClick={() => toggleSetComplete(exerciseIndex(), setIndex())}
                          class={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            set.is_completed 
                              ? 'bg-primary text-white' 
                              : 'bg-neutral-100 dark:bg-dark-surface hover:bg-neutral-200'
                          }`}
                        >
                          <Check class="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </For>

                  {/* Add Set Button */}
                  <button 
                    onClick={() => addSet(exerciseIndex())}
                    class="w-full py-2 border-2 border-dashed border-neutral-200 dark:border-dark-border rounded-xl text-sm text-neutral-500 dark:text-neutral-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus class="w-4 h-4" /> Add Set
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Add Exercise Button */}
        <button 
          onClick={() => setShowExercisePicker(true)}
          class="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-dark-border rounded-xl text-neutral-500 dark:text-neutral-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus class="w-5 h-5" />
          <span class="font-medium">Add Exercise</span>
        </button>
      </Show>

      {/* Exercise Picker Modal */}
      <Show when={showExercisePicker()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowExercisePicker(false)}>
          <div class="bottom-sheet w-full max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <div class="p-4 border-b border-neutral-100 dark:border-dark-border">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg">Select Exercise</h3>
                <button onClick={() => setShowExercisePicker(false)}>
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
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">{exercise.muscle_group}</p>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Finish Confirmation */}
      <Show when={showFinishConfirm()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div class="card w-full max-w-sm p-6">
            <h3 class="text-lg font-bold mb-2">Finish Workout?</h3>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Duration: {formatTime(elapsed())} | {exercises().length} exercises
            </p>
            <textarea
              value={workoutNotes()}
              onInput={(e) => setWorkoutNotes(e.currentTarget.value)}
              class="input mb-4 text-sm"
              placeholder="Workout notes (optional)"
              rows={2}
            />
            <div class="flex gap-3">
              <button 
                onClick={() => setShowFinishConfirm(false)}
                class="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={saveWorkout}
                class="btn-primary flex-1 text-sm"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
