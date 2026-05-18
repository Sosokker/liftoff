import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Search, Plus, ChevronRight, Dumbbell } from 'lucide-solid'

interface Exercise {
  id: number
  name: string
  muscle_group: string
  equipment?: string
  is_custom: number
}

const muscleGroups = ['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Biceps', 'Triceps', 'Core', 'Glutes']

export default function ExercisesPage() {
  const navigate = useNavigate()
  const [exercises, setExercises] = createSignal<Exercise[]>([])
  const [searchQuery, setSearchQuery] = createSignal('')
  const [activeFilter, setActiveFilter] = createSignal('All')
  const [isLoading, setIsLoading] = createSignal(true)
  const [showAddModal, setShowAddModal] = createSignal(false)
  
  // New exercise form
  const [newName, setNewName] = createSignal('')
  const [newMuscle, setNewMuscle] = createSignal('Chest')
  const [newEquipment, setNewEquipment] = createSignal('')
  const [newInstructions, setNewInstructions] = createSignal('')

  createEffect(async () => {
    try {
      const data = await apiFetch('/api/exercises')
      setExercises(data)
    } catch (error) {
      console.error('Failed to load exercises:', error)
    } finally {
      setIsLoading(false)
    }
  })

  const filteredExercises = () => {
    let filtered = exercises()
    
    if (activeFilter() !== 'All') {
      filtered = filtered.filter(ex => ex.muscle_group === activeFilter())
    }
    
    if (searchQuery()) {
      const query = searchQuery().toLowerCase()
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(query) ||
        ex.muscle_group.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }

  async function addCustomExercise(e: Event) {
    e.preventDefault()
    
    if (!newName() || !newMuscle()) return
    
    try {
      await apiFetch('/api/exercises', {
        method: 'POST',
        body: JSON.stringify({
          name: newName(),
          muscle_group: newMuscle(),
          equipment: newEquipment(),
          instructions: newInstructions()
        })
      })
      
      // Reload exercises
      const data = await apiFetch('/api/exercises')
      setExercises(data)
      
      // Reset form
      setNewName('')
      setNewEquipment('')
      setNewInstructions('')
      setShowAddModal(false)
    } catch (error: any) {
      alert(error.message || 'Failed to create exercise')
    }
  }

  return (
    <div class="px-4 py-6 space-y-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xl font-bold">Exercise Library</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          class="btn-primary py-2 px-3 text-sm flex items-center gap-1"
        >
          <Plus class="w-4 h-4" />
          Custom
        </button>
      </div>

      {/* Search */}
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          class="input pl-10"
          placeholder="Search exercises..."
        />
      </div>

      {/* Muscle Group Filters */}
      <div class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
        <For each={muscleGroups}>
          {(group) => (
            <button
              onClick={() => setActiveFilter(group)}
              class={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter() === group
                  ? 'bg-primary text-white'
                  : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
              }`}
            >
              {group}
            </button>
          )}
        </For>
      </div>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Show when={filteredExercises().length > 0} fallback={
          <div class="card p-8 text-center">
            <Dumbbell class="w-12 h-12 text-neutral-300 text-neutral-300 mx-auto mb-3" />
            <p class="text-neutral-500 text-neutral-400">No exercises found</p>
          </div>
        }>
          <div class="space-y-2">
            <For each={filteredExercises()}>
              {(exercise) => (
                <button 
                  onClick={() => navigate(`/exercises/${exercise.id}`)}
                  class="exercise-card w-full text-left flex items-center justify-between"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-medium">{exercise.name}</p>
                      <Show when={exercise.is_custom}>
                        <span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          Custom
                        </span>
                      </Show>
                    </div>
                    <p class="text-xs text-neutral-500 text-neutral-400 mt-0.5">
                      {exercise.muscle_group} {exercise.equipment && `• ${exercise.equipment}`}
                    </p>
                  </div>
                  <ChevronRight class="w-5 h-5 text-neutral-400" />
                </button>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* Add Exercise Modal */}
      <Show when={showAddModal()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div class="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-bold mb-4">Create Custom Exercise</h3>
            <form onSubmit={addCustomExercise} class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-1.5">Exercise Name *</label>
                <input
                  type="text"
                  value={newName()}
                  onInput={(e) => setNewName(e.currentTarget.value)}
                  class="input"
                  placeholder="e.g., Cable Fly"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">Muscle Group *</label>
                <select
                  value={newMuscle()}
                  onChange={(e) => setNewMuscle(e.currentTarget.value)}
                  class="input"
                >
                  <For each={muscleGroups.filter(g => g !== 'All')}>
                    {(group) => <option value={group}>{group}</option>}
                  </For>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">Equipment</label>
                <input
                  type="text"
                  value={newEquipment()}
                  onInput={(e) => setNewEquipment(e.currentTarget.value)}
                  class="input"
                  placeholder="e.g., Cable Machine"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1.5">Instructions</label>
                <textarea
                  value={newInstructions()}
                  onInput={(e) => setNewInstructions(e.currentTarget.value)}
                  class="input text-sm"
                  placeholder="Brief instructions..."
                  rows={2}
                />
              </div>
              <div class="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  class="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" class="btn-primary flex-1 text-sm">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  )
}
