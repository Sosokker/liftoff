import { createSignal, createEffect, Show, For, onCleanup } from 'solid-js'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { saveToStore } from '../../stores/localDb'
import { 
  Play, 
  Check, 
  Plus, 
  Timer,
  X,
  Trash2,
  Loader2,
  BookmarkPlus
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

interface PreviousSet {
  set_number: number
  set_type: string
  reps: number
  weight: number
  rpe: number
}

interface PreviousPerformance {
  workoutDate: string
  sets: PreviousSet[]
}

interface ActiveExercise {
  id?: number
  exercise_id: number
  exercise_name: string
  muscle_group: string
  order_index: number
  notes: string
  sets: WorkoutSet[]
  previousPerformance?: PreviousPerformance
}

export default function WorkoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [isLoadingRoutine, setIsLoadingRoutine] = createSignal(false)
  const [prsDetected, setPrsDetected] = createSignal<Array<{exercise_id: number; type: string; value: number; previousBest?: number}>>([])
  const [showWorkoutSummary, setShowWorkoutSummary] = createSignal(false)
  const [exerciseSearchQuery, setExerciseSearchQuery] = createSignal('')
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = createSignal('All')
  const [savedWorkoutId, setSavedWorkoutId] = createSignal<number | null>(null)
  const [isSavingAsRoutine, setIsSavingAsRoutine] = createSignal(false)
  const [showSaveRoutineModal, setShowSaveRoutineModal] = createSignal(false)
  const [routineNameInput, setRoutineNameInput] = createSignal('')

  let timerInterval: number | null = null
  let audioCtx: AudioContext | null = null

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return audioCtx
  }

  function playBeep(frequency = 800, duration = 0.15, type: OscillatorType = 'sine') {
    try {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = type
      osc.frequency.value = frequency
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration)
      osc.stop(ctx.currentTime + duration)
    } catch {
      // Audio not available
    }
  }

  function playTimerDoneSound() {
    playBeep(600, 0.2)
    setTimeout(() => playBeep(800, 0.3), 200)
    setTimeout(() => playBeep(1000, 0.4), 450)
  }

  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  function sendTimerNotification() {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification('Rest timer done!', {
        body: 'Time to hit your next set 💪',
        icon: '/icon-192x192.svg',
        tag: 'rest-timer'
      })
    }
  }

  async function fetchPreviousPerformance(exerciseId: number): Promise<PreviousPerformance | undefined> {
    try {
      const data = await apiFetch(`/api/workouts/last-session/${exerciseId}`)
      if (data.sets && data.sets.length > 0) {
        return {
          workoutDate: data.workoutDate,
          sets: data.sets.map((s: any) => ({
            set_number: s.set_number,
            set_type: s.set_type,
            reps: s.reps || 0,
            weight: s.weight || 0,
            rpe: s.rpe || 0
          }))
        }
      }
    } catch (e) {
      console.error('Failed to fetch previous performance:', e)
    }
    return undefined
  }

  const filteredAvailableExercises = () => {
    let filtered = availableExercises()

    if (exerciseMuscleFilter() !== 'All') {
      filtered = filtered.filter(ex => ex.muscle_group === exerciseMuscleFilter())
    }

    if (exerciseSearchQuery()) {
      const query = exerciseSearchQuery().toLowerCase()
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.muscle_group.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  // Load exercises
  createEffect(async () => {
    try {
      const data = await apiFetch('/api/exercises')
      setAvailableExercises(data)
    } catch (error) {
      console.error('Failed to load exercises:', error)
    }
  })

  // Load routine if routineId is present in URL
  createEffect(async () => {
    const routineId = searchParams.routineId
    if (!routineId || isActive()) return

    setIsLoadingRoutine(true)
    try {
      const routine = await apiFetch(`/api/routines/${routineId}`)
      if (routine && routine.exercises) {
        setWorkoutName(routine.name)
        const loadedExercises: ActiveExercise[] = []
        for (let idx = 0; idx < routine.exercises.length; idx++) {
          const re = routine.exercises[idx]
          const prev = await fetchPreviousPerformance(re.exercise_id)
          const prevSets = prev?.sets || []
          const setCount = Math.max(re.target_sets || 3, prevSets.length)
          const sets: WorkoutSet[] = []
          for (let i = 0; i < setCount; i++) {
            const p = prevSets[i]
            sets.push({
              set_type: p?.set_type || (i === 0 ? 'warmup' : 'normal'),
              set_number: i + 1,
              reps: p?.reps || re.target_reps || 10,
              weight: p?.weight || 0,
              rpe: p?.rpe || 0,
              is_completed: false
            })
          }
          loadedExercises.push({
            exercise_id: re.exercise_id,
            exercise_name: re.exercise_name,
            muscle_group: re.muscle_group,
            order_index: idx,
            notes: '',
            sets,
            previousPerformance: prev
          })
        }
        setExercises(loadedExercises)
        // Auto-start the workout
        setIsActive(true)
        setStartTime(new Date())
      }
    } catch (error) {
      console.error('Failed to load routine:', error)
    } finally {
      setIsLoadingRoutine(false)
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
      requestNotificationPermission()
      const interval = window.setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setIsResting(false)
            playTimerDoneSound()
            sendTimerNotification()
            return 0
          }
          // Countdown beeps
          if (prev <= 4 && prev > 1) {
            playBeep(600, 0.1)
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

  async function addExercise(exercise: ExerciseDef) {
    const prev = await fetchPreviousPerformance(exercise.id)
    const prevSets = prev?.sets || []

    const newSets: WorkoutSet[] = []
    const setCount = prevSets.length > 0 ? prevSets.length : 1

    for (let i = 0; i < setCount; i++) {
      const prevSet = prevSets[i]
      newSets.push({
        set_type: prevSet?.set_type || 'normal',
        set_number: i + 1,
        reps: prevSet?.reps || 0,
        weight: prevSet?.weight || 0,
        rpe: prevSet?.rpe || 0,
        is_completed: false
      })
    }

    const newExercise: ActiveExercise = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      order_index: exercises().length,
      notes: '',
      sets: newSets,
      previousPerformance: prev
    }
    setExercises([...exercises(), newExercise])
    setShowExercisePicker(false)
  }

  function createSet(setNumber: number, prevSet?: PreviousSet): WorkoutSet {
    return {
      set_type: prevSet?.set_type || 'normal',
      set_number: setNumber,
      reps: prevSet?.reps || 0,
      weight: prevSet?.weight || 0,
      rpe: prevSet?.rpe || 0,
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
    const prevSet = updated[exerciseIndex].previousPerformance?.sets[newSetNumber - 1]
    updated[exerciseIndex].sets.push(createSet(newSetNumber, prevSet))
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
      const result = await apiFetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workoutData)
      })

      if (result.queued) {
        // Saved offline — store locally and will sync when online
        try {
          await saveToStore('workouts', {
            name: workoutData.name,
            start_time: startTime()?.toISOString(),
            duration_seconds: workoutData.duration_seconds,
            notes: workoutData.notes,
            exercise_count: workoutData.exercises.length,
            completed_sets: workoutData.exercises.reduce((sum: number, ex: any) => sum + ex.sets.filter((s: any) => s.is_completed).length, 0),
            created_at: new Date().toISOString(),
            _offline: true
          })
        } catch {
          // ignore local save errors
        }
        resetWorkoutState()
        navigate('/workout/history')
        return
      }

      if (result.personalRecords && result.personalRecords.length > 0) {
        setPrsDetected(result.personalRecords)
      }
      setSavedWorkoutId(result.id)
      setRoutineNameInput(`${workoutName()} Routine`)
      setShowWorkoutSummary(true)
    } catch (error: any) {
      console.error('Failed to save workout:', error)
      alert(error.message || 'Failed to save workout. Will retry when online.')
    }
  }

  async function saveAsRoutine() {
    if (!savedWorkoutId()) return
    setIsSavingAsRoutine(true)
    try {
      const result = await apiFetch(`/api/workouts/${savedWorkoutId()}/save-as-routine`, {
        method: 'POST',
        body: JSON.stringify({ name: routineNameInput() || undefined })
      })
      setShowSaveRoutineModal(false)
      alert(`Routine "${result.name}" saved!`)
    } catch (err: any) {
      alert(err.message || 'Failed to save routine')
    } finally {
      setIsSavingAsRoutine(false)
    }
  }

  function resetWorkoutState() {
    setIsActive(false)
    setStartTime(null)
    setElapsed(0)
    setExercises([])
    setWorkoutName('')
    setWorkoutNotes('')
    setShowFinishConfirm(false)
    setShowWorkoutSummary(false)
    setShowSaveRoutineModal(false)
    setPrsDetected([])
    setSavedWorkoutId(null)
    setRoutineNameInput('')
  }

  const setTypeColors: Record<string, string> = {
    warmup: 'bg-yellow-900/30 text-yellow-400 bg-yellow-900/30 text-yellow-400',
    normal: 'bg-[#262626] text-neutral-400 bg-[#1a1a1a] text-neutral-300',
    drop_set: 'bg-purple-900/30 text-purple-400 bg-purple-900/30 text-purple-400',
    failure: 'bg-red-900/30 text-red-400 bg-red-900/30 text-red-400',
    superset: 'bg-blue-900/30 text-blue-400 bg-blue-900/30 text-blue-400'
  }

  return (
    <div class="px-4 py-6 space-y-4">
      {/* Workout Header */}
      <Show when={!isActive()}>
        <Show when={isLoadingRoutine()}>
          <div class="text-center py-12">
            <Loader2 class="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p class="text-neutral-400">Loading routine...</p>
          </div>
        </Show>
        <Show when={!isLoadingRoutine()}>
          <div class="text-center py-8">
            <div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play class="w-8 h-8 text-primary ml-1" />
            </div>
            <h2 class="text-xl font-bold mb-2">Start Workout</h2>
            <p class="text-sm text-neutral-400 mb-6">
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
            <p class="text-sm text-neutral-400">
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
                <div class="p-4 border-b border-[#262626]">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="font-semibold">{exercise.exercise_name}</h3>
                      <p class="text-xs text-neutral-400">{exercise.muscle_group}</p>
                    </div>
                    <button 
                      onClick={() => removeExercise(exerciseIndex())}
                      class="p-1 hover:bg-red-950/30 hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 class="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div class="p-4 space-y-2">
                  {/* Previous Performance */}
                  <Show when={exercise.previousPerformance}>
                    <div class="bg-[#1a1a1a] rounded-lg px-3 py-2 flex items-center gap-2">
                      <span class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider">Prev</span>
                      <div class="flex-1 flex gap-2 overflow-x-auto">
                        <For each={exercise.previousPerformance!.sets}>
                          {(prevSet) => (
                            <span class="text-xs text-neutral-300 whitespace-nowrap">
                              {prevSet.weight || '-'}×{prevSet.reps || '-'}
                            </span>
                          )}
                        </For>
                      </div>
                      <span class="text-[10px] text-neutral-400">
                        {new Date(exercise.previousPerformance!.workoutDate).toLocaleDateString()}
                      </span>
                    </div>
                  </Show>

                  {/* Set Header */}
                  <div class="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-neutral-400 px-2">
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
                          class="w-full bg-transparent border border-[#333] border-[#262626] rounded-lg px-2 py-1 text-sm text-center"
                          placeholder="0"
                          min="0"
                          step="0.5"
                        />
                        
                        <input
                          type="number"
                          value={set.reps || ''}
                          onInput={(e) => updateSet(exerciseIndex(), setIndex(), 'reps', parseInt(e.currentTarget.value) || 0)}
                          class="w-full bg-transparent border border-[#333] border-[#262626] rounded-lg px-2 py-1 text-sm text-center"
                          placeholder="0"
                          min="0"
                        />
                        
                        <select
                          value={set.rpe || ''}
                          onChange={(e) => updateSet(exerciseIndex(), setIndex(), 'rpe', parseInt(e.currentTarget.value) || 0)}
                          class="w-full bg-transparent border border-[#333] border-[#262626] rounded-lg px-1 py-1 text-sm text-center"
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
                              : 'bg-[#262626] bg-[#1a1a1a] hover:bg-[#333]'
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
                    class="w-full py-2 border-2 border-dashed border-[#333] border-[#262626] rounded-xl text-sm text-neutral-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
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
          class="w-full py-4 border-2 border-dashed border-[#333] border-[#262626] rounded-xl text-neutral-400 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus class="w-5 h-5" />
          <span class="font-medium">Add Exercise</span>
        </button>
      </Show>

      {/* Exercise Picker Modal */}
      <Show when={showExercisePicker()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowExercisePicker(false)}>
          <div class="bottom-sheet w-full max-h-[70vh]" onClick={(e) => e.stopPropagation()}>
            <div class="p-4 border-b border-[#262626] space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-lg">Select Exercise</h3>
                <button onClick={() => setShowExercisePicker(false)}>
                  <X class="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                value={exerciseSearchQuery()}
                onInput={(e) => setExerciseSearchQuery(e.currentTarget.value)}
                class="input w-full text-sm"
                placeholder="Search exercises..."
              />
              <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <For each={['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Glutes', 'Cardio']}>
                  {(group) => (
                    <button
                      onClick={() => setExerciseMuscleFilter(group)}
                      class={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                        exerciseMuscleFilter() === group
                          ? 'bg-primary text-white'
                          : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
                      }`}
                    >
                      {group}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <div class="p-4 space-y-2 overflow-auto max-h-[45vh]">
              <For each={filteredAvailableExercises()}>
                {(exercise) => (
                  <button
                    onClick={() => addExercise(exercise)}
                    class="exercise-card w-full text-left"
                  >
                    <p class="font-medium">{exercise.name}</p>
                    <p class="text-xs text-neutral-400">{exercise.muscle_group}</p>
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
            <p class="text-sm text-neutral-400 mb-4">
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

      {/* Workout Summary */}
      <Show when={showWorkoutSummary()}>
        <div class="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 overflow-auto">
          <div class="card w-full max-w-sm p-6">
            <div class="text-center mb-4">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check class="w-8 h-8 text-primary" />
              </div>
              <h3 class="text-xl font-bold">Workout Complete!</h3>
              <p class="text-sm text-neutral-400">
                {workoutName()} • {formatTime(elapsed())}
              </p>
            </div>

            {/* Stats */}
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="bg-[#1a1a1a] rounded-xl p-3 text-center">
                <p class="text-lg font-bold text-primary">
                  {exercises().reduce((sum, ex) => sum + ex.sets.filter(s => s.is_completed).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0)}
                </p>
                <p class="text-[10px] text-neutral-500">Volume</p>
              </div>
              <div class="bg-[#1a1a1a] rounded-xl p-3 text-center">
                <p class="text-lg font-bold text-primary">{exercises().length}</p>
                <p class="text-[10px] text-neutral-500">Exercises</p>
              </div>
              <div class="bg-[#1a1a1a] rounded-xl p-3 text-center">
                <p class="text-lg font-bold text-primary">
                  {exercises().reduce((sum, ex) => sum + ex.sets.filter(s => s.is_completed).length, 0)}
                </p>
                <p class="text-[10px] text-neutral-500">Sets</p>
              </div>
            </div>

            {/* PRs */}
            <Show when={prsDetected().length > 0}>
              <div class="mb-4">
                <p class="text-xs font-medium text-yellow-400 text-yellow-400 mb-2 uppercase tracking-wider">New PRs 🏆</p>
                <div class="space-y-2">
                  <For each={prsDetected()}>
                    {(pr) => {
                      const ex = exercises().find(e => e.exercise_id === pr.exercise_id)
                      const label = pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'vol'
                      return (
                        <div class="bg-yellow-950/30 bg-yellow-900/20 border border-yellow-200 border-yellow-800 rounded-xl p-2.5 flex items-center justify-between">
                          <span class="font-medium text-sm">{ex?.exercise_name || 'Exercise'}</span>
                          <span class="text-xs font-bold text-yellow-400 text-yellow-400">
                            {pr.type === 'weight' ? 'Weight PR' : pr.type === 'reps' ? 'Reps PR' : 'Volume PR'}
                            <span class="text-neutral-500 font-normal ml-1">{pr.value} {label}</span>
                          </span>
                        </div>
                      )
                    }}
                  </For>
                </div>
              </div>
            </Show>

            {/* Exercises recap */}
            <div class="space-y-2 mb-4 max-h-[30vh] overflow-y-auto">
              <For each={exercises()}>
                {(ex) => (
                  <div class="bg-[#1a1a1a] rounded-xl p-3">
                    <p class="font-medium text-sm">{ex.exercise_name}</p>
                    <div class="flex gap-2 mt-1 flex-wrap">
                      <For each={ex.sets.filter(s => s.is_completed)}>
                        {(set) => (
                          <span class="text-xs bg-[#0a0a0a] px-2 py-0.5 rounded-md">
                            {set.weight || '-'}×{set.reps || '-'}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>
            </div>

            <div class="space-y-2">
              <button
                onClick={() => setShowSaveRoutineModal(true)}
                class="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <BookmarkPlus class="w-4 h-4" />
                Save as Routine
              </button>
              <button
                onClick={() => {
                  resetWorkoutState()
                  navigate('/workout/history')
                }}
                class="btn-primary w-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Save as Routine Modal */}
      <Show when={showSaveRoutineModal()}>
        <div class="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div class="card w-full max-w-sm p-6">
            <h3 class="text-lg font-bold mb-2">Save as Routine</h3>
            <p class="text-sm text-neutral-400 mb-4">
              Create a reusable routine from this workout
            </p>
            <input
              type="text"
              value={routineNameInput()}
              onInput={(e) => setRoutineNameInput(e.currentTarget.value)}
              class="input mb-4 w-full"
              placeholder="Routine name"
            />
            <div class="flex gap-3">
              <button
                onClick={() => setShowSaveRoutineModal(false)}
                class="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveAsRoutine}
                disabled={isSavingAsRoutine()}
                class="btn-primary flex-1 text-sm"
              >
                {isSavingAsRoutine() ? 'Saving...' : 'Save Routine'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
