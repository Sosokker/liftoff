import { createSignal, createEffect, Show, For } from 'solid-js'
import { apiFetch } from '../../stores/authStore'
import { Plus, TrendingUp, Calendar, Scale, Camera, X, Image } from 'lucide-solid'

interface Measurement {
  id: number
  date: string
  weight?: number
  body_fat?: number
  neck?: number
  chest?: number
  waist?: number
  hips?: number
  biceps?: number
  forearms?: number
  thighs?: number
  calves?: number
}

interface ProgressPhoto {
  id: number
  date: string
  photo_data?: string
  caption?: string
}

export default function BodyPage() {
  const [measurements, setMeasurements] = createSignal<Measurement[]>([])
  const [weightAverage, setWeightAverage] = createSignal<any[]>([])
  const [photos, setPhotos] = createSignal<ProgressPhoto[]>([])
  const [isLoading, setIsLoading] = createSignal(true)
  const [showAddModal, setShowAddModal] = createSignal(false)
  const [showPhotoModal, setShowPhotoModal] = createSignal(false)
  
  // Form state
  const [date, setDate] = createSignal(new Date().toISOString().split('T')[0])
  const [weight, setWeight] = createSignal('')
  const [bodyFat, setBodyFat] = createSignal('')
  const [neck, setNeck] = createSignal('')
  const [chest, setChest] = createSignal('')
  const [waist, setWaist] = createSignal('')
  const [hips, setHips] = createSignal('')
  const [biceps, setBiceps] = createSignal('')
  const [forearms, setForearms] = createSignal('')
  const [thighs, setThighs] = createSignal('')
  const [calves, setCalves] = createSignal('')
  
  // Photo form state
  const [photoDate, setPhotoDate] = createSignal(new Date().toISOString().split('T')[0])
  const [photoCaption, setPhotoCaption] = createSignal('')
  const [photoPreview, setPhotoPreview] = createSignal<string | null>(null)

  const [activeTab, setActiveTab] = createSignal<'weight' | 'measurements' | 'photos'>('weight')

  createEffect(async () => {
    try {
      const [measData, avgData, photoData] = await Promise.all([
        apiFetch('/api/body/measurements?limit=30'),
        apiFetch('/api/body/weight-average'),
        apiFetch('/api/body/photos')
      ])
      setMeasurements(measData)
      setWeightAverage(avgData)
      setPhotos(photoData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  })

  async function addMeasurement(e: Event) {
    e.preventDefault()
    
    try {
      await apiFetch('/api/body/measurements', {
        method: 'POST',
        body: JSON.stringify({
          date: date(),
          weight: weight() ? parseFloat(weight()) : null,
          body_fat: bodyFat() ? parseFloat(bodyFat()) : null,
          neck: neck() ? parseFloat(neck()) : null,
          chest: chest() ? parseFloat(chest()) : null,
          waist: waist() ? parseFloat(waist()) : null,
          hips: hips() ? parseFloat(hips()) : null,
          biceps: biceps() ? parseFloat(biceps()) : null,
          forearms: forearms() ? parseFloat(forearms()) : null,
          thighs: thighs() ? parseFloat(thighs()) : null,
          calves: calves() ? parseFloat(calves()) : null
        })
      })
      
      // Reload
      const data = await apiFetch('/api/body/measurements?limit=30')
      setMeasurements(data)
      
      // Reset form
      setWeight('')
      setBodyFat('')
      setNeck('')
      setChest('')
      setWaist('')
      setHips('')
      setBiceps('')
      setForearms('')
      setThighs('')
      setCalves('')
      setShowAddModal(false)
    } catch (error: any) {
      alert(error.message || 'Failed to save measurement')
    }
  }

  function handlePhotoSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image too large. Max 5MB.')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function uploadPhoto(e: Event) {
    e.preventDefault()
    
    if (!photoPreview()) {
      alert('Please select a photo')
      return
    }
    
    try {
      await apiFetch('/api/body/photos', {
        method: 'POST',
        body: JSON.stringify({
          date: photoDate(),
          photo_data: photoPreview(),
          caption: photoCaption()
        })
      })
      
      // Reload photos
      const data = await apiFetch('/api/body/photos')
      setPhotos(data)
      
      // Reset form
      setPhotoDate(new Date().toISOString().split('T')[0])
      setPhotoCaption('')
      setPhotoPreview(null)
      setShowPhotoModal(false)
    } catch (error: any) {
      alert(error.message || 'Failed to upload photo')
    }
  }

  async function deletePhoto(id: number) {
    if (!confirm('Delete this photo?')) return
    
    try {
      await apiFetch(`/api/body/photos/${id}`, { method: 'DELETE' })
      setPhotos(photos().filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }

  const latestMeasurement = () => measurements()[0]

  return (
    <div class="px-4 py-6 space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold">Body & Metrics</h2>
        <button 
          onClick={() => {
            if (activeTab() === 'photos') {
              setShowPhotoModal(true)
            } else {
              setShowAddModal(true)
            }
          }}
          class="btn-primary py-2 px-3 text-sm flex items-center gap-1"
        >
          <Plus class="w-4 h-4" />
          {activeTab() === 'photos' ? 'Photo' : 'Log'}
        </button>
      </div>

      {/* Latest Stats */}
      <Show when={latestMeasurement()}>
        <div class="grid grid-cols-2 gap-3">
          <Show when={latestMeasurement()?.weight}>
            <div class="stat-card p-3">
              <div class="flex items-center gap-1.5 mb-1">
                <Scale class="w-3.5 h-3.5 text-primary" />
                <span class="text-[10px] font-medium text-primary">Weight</span>
              </div>
              <p class="text-xl font-bold">{latestMeasurement()?.weight}</p>
              <p class="text-[10px] text-neutral-500 text-neutral-400">latest</p>
            </div>
          </Show>
          <Show when={latestMeasurement()?.body_fat}>
            <div class="stat-card p-3">
              <div class="flex items-center gap-1.5 mb-1">
                <TrendingUp class="w-3.5 h-3.5 text-primary" />
                <span class="text-[10px] font-medium text-primary">Body Fat %</span>
              </div>
              <p class="text-xl font-bold">{latestMeasurement()?.body_fat}%</p>
              <p class="text-[10px] text-neutral-500 text-neutral-400">latest</p>
            </div>
          </Show>
        </div>
      </Show>

      {/* Tabs */}
      <div class="flex gap-2">
        <button
          onClick={() => setActiveTab('weight')}
          class={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab() === 'weight'
              ? 'bg-primary text-white'
              : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
          }`}
        >
          Weight
        </button>
        <button
          onClick={() => setActiveTab('measurements')}
          class={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab() === 'measurements'
              ? 'bg-primary text-white'
              : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
          }`}
        >
          Measurements
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          class={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            activeTab() === 'photos'
              ? 'bg-primary text-white'
              : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
          }`}
        >
          Photos
        </button>
      </div>

      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Show when={activeTab() === 'weight'}>
          {/* Weekly Averages */}
          <Show when={weightAverage().length > 0}>
            <div>
              <h3 class="font-semibold mb-3">Weekly Averages</h3>
              <div class="card p-4 space-y-3">
                <For each={weightAverage()}>
                  {(week) => (
                    <div class="flex items-center justify-between">
                      <div>
                        <p class="text-sm font-medium">Week {week.week?.split('-')[1]}</p>
                        <p class="text-xs text-neutral-500 text-neutral-400">
                          {week.entry_count} entries
                        </p>
                      </div>
                      <p class="font-bold text-primary">{parseFloat(week.avg_weight).toFixed(1)}</p>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Weight Entries */}
          <div>
            <h3 class="font-semibold mb-3">Recent Entries</h3>
            <Show when={measurements().length > 0} fallback={
              <p class="text-sm text-neutral-500 text-neutral-400">No measurements yet</p>
            }>
              <div class="space-y-2">
                <For each={measurements().filter(m => m.weight)}>
                  {(m) => (
                    <div class="card p-3 flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <Calendar class="w-4 h-4 text-neutral-400" />
                        <span class="text-sm">{m.date}</span>
                      </div>
                      <span class="font-semibold">{m.weight} kg/lbs</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={activeTab() === 'measurements'}>
          {/* Body Measurements Table */}
          <Show when={measurements().length > 0} fallback={
            <p class="text-sm text-neutral-500 text-neutral-400">No measurements yet</p>
          }>
            <div class="card overflow-hidden">
              <div class="p-4 space-y-4">
                <For each={measurements().slice(0, 10)}>
                  {(m) => (
                    <div class="border-b border-[#262626] border-[#262626] last:border-0 pb-4 last:pb-0">
                      <p class="text-xs font-medium text-neutral-500 text-neutral-400 mb-2">
                        {m.date}
                      </p>
                      <div class="grid grid-cols-3 gap-2 text-sm">
                        <Show when={m.neck}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Neck</p>
                            <p class="font-semibold">{m.neck}</p>
                          </div>
                        </Show>
                        <Show when={m.chest}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Chest</p>
                            <p class="font-semibold">{m.chest}</p>
                          </div>
                        </Show>
                        <Show when={m.waist}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Waist</p>
                            <p class="font-semibold">{m.waist}</p>
                          </div>
                        </Show>
                        <Show when={m.hips}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Hips</p>
                            <p class="font-semibold">{m.hips}</p>
                          </div>
                        </Show>
                        <Show when={m.biceps}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Biceps</p>
                            <p class="font-semibold">{m.biceps}</p>
                          </div>
                        </Show>
                        <Show when={m.forearms}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Forearms</p>
                            <p class="font-semibold">{m.forearms}</p>
                          </div>
                        </Show>
                        <Show when={m.thighs}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Thighs</p>
                            <p class="font-semibold">{m.thighs}</p>
                          </div>
                        </Show>
                        <Show when={m.calves}>
                          <div class="bg-[#1a1a1a] bg-[#1a1a1a] rounded-lg p-2 text-center">
                            <p class="text-[10px] text-neutral-400">Calves</p>
                            <p class="font-semibold">{m.calves}</p>
                          </div>
                        </Show>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </Show>

        <Show when={activeTab() === 'photos'}>
          {/* Progress Photos Gallery */}
          <Show when={photos().length > 0} fallback={
            <div class="card p-8 text-center">
              <Camera class="w-12 h-12 text-neutral-300 text-neutral-300 mx-auto mb-3" />
              <p class="text-neutral-500 text-neutral-400 mb-2">No progress photos yet</p>
              <p class="text-sm text-neutral-400 text-neutral-500">Take photos to track your visual progress</p>
            </div>
          }>
            <div class="grid grid-cols-2 gap-3">
              <For each={photos()}>
                {(photo) => (
                  <div class="card overflow-hidden">
                    <Show when={photo.photo_data}>
                      <img 
                        src={photo.photo_data} 
                        alt={`Progress photo from ${photo.date}`}
                        class="w-full aspect-square object-cover"
                      />
                    </Show>
                    <Show when={!photo.photo_data}>
                      <div class="w-full aspect-square bg-[#262626] bg-[#1a1a1a] flex items-center justify-center">
                        <Image class="w-8 h-8 text-neutral-400" />
                      </div>
                    </Show>
                    <div class="p-2">
                      <p class="text-xs font-medium">{photo.date}</p>
                      <Show when={photo.caption}>
                        <p class="text-[10px] text-neutral-500 text-neutral-400 truncate">{photo.caption}</p>
                      </Show>
                      <button
                        onClick={() => deletePhoto(Number(photo.id))}
                        class="text-[10px] text-red-500 mt-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Show>

      {/* Add Measurement Modal */}
      <Show when={showAddModal()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div class="card w-full max-w-md p-6 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-bold mb-4">Log Measurement</h3>
            <form onSubmit={addMeasurement} class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-1.5">Date *</label>
                <input
                  type="date"
                  value={date()}
                  onInput={(e) => setDate(e.currentTarget.value)}
                  class="input"
                  required
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium mb-1.5">Weight</label>
                  <input
                    type="number"
                    value={weight()}
                    onInput={(e) => setWeight(e.currentTarget.value)}
                    class="input"
                    placeholder="kg/lbs"
                    step="0.1"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1.5">Body Fat %</label>
                  <input
                    type="number"
                    value={bodyFat()}
                    onInput={(e) => setBodyFat(e.currentTarget.value)}
                    class="input"
                    placeholder="%"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
              
              <div class="pt-2">
                <p class="text-xs font-medium text-neutral-500 text-neutral-400 mb-2">Body Measurements (cm/in)</p>
                <div class="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Neck', value: neck, setter: setNeck },
                    { label: 'Chest', value: chest, setter: setChest },
                    { label: 'Waist', value: waist, setter: setWaist },
                    { label: 'Hips', value: hips, setter: setHips },
                    { label: 'Biceps', value: biceps, setter: setBiceps },
                    { label: 'Forearms', value: forearms, setter: setForearms },
                    { label: 'Thighs', value: thighs, setter: setThighs },
                    { label: 'Calves', value: calves, setter: setCalves }
                  ].map(field => (
                    <div>
                      <label class="block text-xs font-medium mb-1">{field.label}</label>
                      <input
                        type="number"
                        value={field.value()}
                        onInput={(e) => field.setter(e.currentTarget.value)}
                        class="input py-2 text-sm"
                        placeholder="cm/in"
                        step="0.1"
                      />
                    </div>
                  ))}
                </div>
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Add Photo Modal */}
      <Show when={showPhotoModal()}>
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowPhotoModal(false)}>
          <div class="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 class="text-lg font-bold mb-4">Add Progress Photo</h3>
            <form onSubmit={uploadPhoto} class="space-y-3">
              <div>
                <label class="block text-sm font-medium mb-1.5">Date *</label>
                <input
                  type="date"
                  value={photoDate()}
                  onInput={(e) => setPhotoDate(e.currentTarget.value)}
                  class="input"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1.5">Photo *</label>
                <Show when={photoPreview()} fallback={
                  <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] border-[#262626] rounded-xl cursor-pointer hover:border-primary transition-colors">
                    <Camera class="w-8 h-8 text-neutral-400 mb-2" />
                    <span class="text-sm text-neutral-500">Tap to take photo or upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      class="hidden"
                    />
                  </label>
                }>
                  <div class="relative">
                    <img 
                      src={photoPreview()!} 
                      alt="Preview" 
                      class="w-full rounded-xl object-cover max-h-48"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoPreview(null)}
                      class="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white"
                    >
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </Show>
              </div>
              
              <div>
                <label class="block text-sm font-medium mb-1.5">Caption (optional)</label>
                <input
                  type="text"
                  value={photoCaption()}
                  onInput={(e) => setPhotoCaption(e.currentTarget.value)}
                  class="input"
                  placeholder="e.g., Week 4 progress"
                />
              </div>

              <div class="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  class="btn-secondary flex-1 text-sm"
                >
                  Cancel
                </button>
                <button type="submit" class="btn-primary flex-1 text-sm">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  )
}
