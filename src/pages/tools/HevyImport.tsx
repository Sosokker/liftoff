import { createSignal, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Upload, ArrowLeft, CheckCircle, AlertCircle, FileSpreadsheet, Dumbbell, Calendar, Loader2 } from 'lucide-solid'

// ─── CSV parsing helpers (mirrors server logic) ───

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseHevyDate(dateStr: string): Date | null {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d
    const parts = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/)
    if (parts) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      }
      const month = months[parts[2].toLowerCase().slice(0, 3)]
      if (month !== undefined) {
        return new Date(parseInt(parts[3]), month, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5]))
      }
    }
  } catch { /* ignore */ }
  return null
}

interface HevySet {
  setType: string
  setIndex: number
  reps: number | null
  weightKg: number | null
  rpe: number | null
}

interface HevyExercise {
  title: string
  notes: string
  sets: HevySet[]
}

interface HevyWorkout {
  title: string
  startTime: string
  endTime: string | null
  description: string
  exercises: HevyExercise[]
}

function parseHevyCSV(csvText: string): HevyWorkout[] {
  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const colIndex: Record<string, number> = {}
  headers.forEach((h, i) => { colIndex[h] = i })

  const requiredCols = ['title', 'start_time', 'exercise_title', 'set_index', 'set_type']
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) return []
  }

  const workoutsMap = new Map<string, HevyWorkout>()

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < headers.length) continue

    const title = fields[colIndex['title']] || 'Workout'
    const startTimeStr = fields[colIndex['start_time']]
    const startTime = parseHevyDate(startTimeStr)
    if (!startTime) continue

    const workoutKey = `${title}|${startTimeStr}`
    if (!workoutsMap.has(workoutKey)) {
      const endTime = parseHevyDate(fields[colIndex['end_time']])
      workoutsMap.set(workoutKey, {
        title,
        startTime: startTime.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        description: fields[colIndex['description']] || '',
        exercises: []
      })
    }

    const workout = workoutsMap.get(workoutKey)!
    const exerciseTitle = fields[colIndex['exercise_title']]
    if (!exerciseTitle) continue

    let exercise = workout.exercises.find(e => e.title === exerciseTitle)
    if (!exercise) {
      exercise = {
        title: exerciseTitle,
        notes: fields[colIndex['exercise_notes']] || '',
        sets: []
      }
      workout.exercises.push(exercise)
    }

    const weightKg = fields[colIndex['weight_kg']]
    const reps = fields[colIndex['reps']]
    const rpe = fields[colIndex['rpe']]

    exercise.sets.push({
      setType: fields[colIndex['set_type']] || 'normal',
      setIndex: parseInt(fields[colIndex['set_index']] || '0', 10) || 0,
      reps: reps ? parseInt(reps, 10) : null,
      weightKg: weightKg ? parseFloat(weightKg) : null,
      rpe: rpe ? parseFloat(rpe) : null
    })
  }

  return Array.from(workoutsMap.values())
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// ─── Component ───

interface ImportResult {
  success: boolean
  workoutsCreated: number
  exercisesCreated: number
  exercisesMapped: number
  setsCreated: number
  totalRowsParsed: number
  errors?: string[]
}

export default function HevyImportPage() {
  const navigate = useNavigate()
  const [file, setFile] = createSignal<File | null>(null)
  const [csvPreview, setCsvPreview] = createSignal('')
  const [isImporting, setIsImporting] = createSignal(false)
  const [result, setResult] = createSignal<ImportResult | null>(null)
  const [error, setError] = createSignal('')
  const [dragActive, setDragActive] = createSignal(false)
  const [progress, setProgress] = createSignal({ current: 0, total: 0 })

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const selectedFile = input.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer?.files[0]
    if (droppedFile) processFile(droppedFile)
  }

  function processFile(selectedFile: File) {
    setError('')
    setResult(null)

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.')
      return
    }

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvPreview(text.slice(0, 2000))
    }
    reader.readAsText(selectedFile)
  }

  async function importCSV() {
    if (!file()) return

    setIsImporting(true)
    setError('')
    setResult(null)

    try {
      const text = await file()!.text()
      const workouts = parseHevyCSV(text)

      if (workouts.length === 0) {
        throw new Error('No valid workouts found in CSV. Check the format.')
      }

      const chunks = chunkArray(workouts, 8)
      setProgress({ current: 0, total: chunks.length })

      let totalWorkouts = 0
      let totalExercisesCreated = 0
      let totalExercisesMapped = 0
      let totalSets = 0
      const errors: string[] = []

      for (let i = 0; i < chunks.length; i++) {
        setProgress({ current: i + 1, total: chunks.length })
        try {
          const chunkResult = await apiFetch('/api/tools/import-hevy-batch', {
            method: 'POST',
            body: JSON.stringify({ workouts: chunks[i] })
          })
          totalWorkouts += chunkResult.workoutsCreated || 0
          totalExercisesCreated += chunkResult.exercisesCreated || 0
          totalExercisesMapped += chunkResult.exercisesMapped || 0
          totalSets += chunkResult.setsCreated || 0
        } catch (err: any) {
          errors.push(`Chunk ${i + 1}/${chunks.length} failed: ${err.message}`)
        }
      }

      setResult({
        success: errors.length === 0,
        workoutsCreated: totalWorkouts,
        exercisesCreated: totalExercisesCreated,
        exercisesMapped: totalExercisesMapped,
        setsCreated: totalSets,
        totalRowsParsed: workouts.length,
        errors: errors.length > 0 ? errors : undefined
      })
    } catch (err: any) {
      setError(err.message || 'Import failed. Please check your CSV format.')
    } finally {
      setIsImporting(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  function reset() {
    setFile(null)
    setCsvPreview('')
    setResult(null)
    setError('')
    setProgress({ current: 0, total: 0 })
  }

  return (
    <div class="px-4 py-6 space-y-6">
      {/* Header */}
      <div class="flex items-center gap-3">
        <button
          onClick={() => navigate('/tools')}
          class="p-2 hover:bg-neutral-100 dark:hover:bg-dark-surface rounded-xl transition-colors"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-xl font-bold">Import from Hevy</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Import your workout history from a Hevy CSV export
          </p>
        </div>
      </div>

      <Show when={!result()}>
        {/* Upload Area */}
        <Show when={!file()}>
          <div
            class={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              dragActive()
                ? 'border-primary bg-primary/5'
                : 'border-neutral-200 dark:border-dark-border'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div class="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload class="w-8 h-8 text-primary" />
            </div>
            <p class="font-medium mb-1">Drop your Hevy CSV here</p>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              or click to browse files
            </p>
            <label class="btn-primary py-2 px-4 text-sm inline-flex items-center gap-2 cursor-pointer">
              <FileSpreadsheet class="w-4 h-4" />
              Select CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                class="hidden"
              />
            </label>
          </div>
        </Show>

        {/* File Selected */}
        <Show when={file()}>
          <div class="card p-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileSpreadsheet class="w-5 h-5 text-primary" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{file()!.name}</p>
                <p class="text-sm text-neutral-500 dark:text-neutral-400">
                  {(file()!.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={reset}
                class="text-sm text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>

            {/* Preview */}
            <Show when={csvPreview()}>
              <div class="mb-4">
                <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                  Preview (first 20 lines)
                </p>
                <div class="bg-neutral-50 dark:bg-dark-surface rounded-xl p-3 overflow-x-auto">
                  <pre class="text-xs text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap break-all">
                    {csvPreview().split('\n').slice(0, 20).join('\n')}
                  </pre>
                </div>
              </div>
            </Show>

            <div class="flex gap-3">
              <button
                onClick={reset}
                class="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={importCSV}
                disabled={isImporting()}
                class="btn-primary flex-1 text-sm"
              >
                {isImporting() ? 'Importing...' : 'Import Workouts'}
              </button>
            </div>
          </div>
        </Show>
      </Show>

      {/* Error */}
      <Show when={error()}>
        <div class="card p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div class="flex items-start gap-3">
            <AlertCircle class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p class="font-medium text-red-700 dark:text-red-400">Import Failed</p>
              <p class="text-sm text-red-600 dark:text-red-300 mt-1">{error()}</p>
            </div>
          </div>
        </div>
      </Show>

      {/* Loading with Progress */}
      <Show when={isImporting()}>
        <div class="card p-8 text-center">
          <Loader2 class="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
          <p class="font-medium">Importing your workouts...</p>
          <Show when={progress().total > 0}>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Batch {progress().current} of {progress().total}
            </p>
            <div class="w-full bg-neutral-200 dark:bg-dark-border rounded-full h-2 mt-3 overflow-hidden">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress().total > 0 ? (progress().current / progress().total) * 100 : 0}%`
                }}
              />
            </div>
          </Show>
        </div>
      </Show>

      {/* Result */}
      <Show when={result()}>
        <div class="space-y-4">
          <div class="card p-6 bg-primary/5 border-primary/20">
            <div class="flex items-center gap-3 mb-4">
              <CheckCircle class="w-8 h-8 text-primary" />
              <div>
                <h3 class="text-lg font-bold">Import Complete!</h3>
                <p class="text-sm text-neutral-600 dark:text-neutral-300">
                  Your Hevy workouts have been imported successfully
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white dark:bg-dark-bg rounded-xl p-3 text-center">
                <Calendar class="w-5 h-5 text-primary mx-auto mb-1" />
                <p class="text-2xl font-bold">{result()?.workoutsCreated}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Workouts</p>
              </div>
              <div class="bg-white dark:bg-dark-bg rounded-xl p-3 text-center">
                <Dumbbell class="w-5 h-5 text-primary mx-auto mb-1" />
                <p class="text-2xl font-bold">{result()?.setsCreated}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Sets</p>
              </div>
              <div class="bg-white dark:bg-dark-bg rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">{result()?.exercisesMapped}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Exercises Matched</p>
              </div>
              <div class="bg-white dark:bg-dark-bg rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">{result()?.exercisesCreated}</p>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">New Exercises</p>
              </div>
            </div>
          </div>

          {/* Errors */}
          <Show when={result()?.errors && result()!.errors!.length > 0}>
            <div class="card p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div class="flex items-start gap-3">
                <AlertCircle class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p class="font-medium text-yellow-800 dark:text-yellow-400">
                    {result()!.errors!.length} warning{result()!.errors!.length > 1 ? 's' : ''}
                  </p>
                  <ul class="mt-2 space-y-1">
                    <For each={result()?.errors}>
                      {(err) => (
                        <li class="text-sm text-yellow-700 dark:text-yellow-300">{err}</li>
                      )}
                    </For>
                  </ul>
                </div>
              </div>
            </div>
          </Show>

          <div class="flex gap-3">
            <button
              onClick={reset}
              class="btn-secondary flex-1 text-sm"
            >
              Import Another File
            </button>
            <button
              onClick={() => navigate('/workout/history')}
              class="btn-primary flex-1 text-sm"
            >
              View Workouts
            </button>
          </div>
        </div>
      </Show>

      {/* Instructions */}
      <Show when={!file() && !result()}>
        <div class="card p-4">
          <h3 class="font-semibold mb-3">How to export from Hevy</h3>
          <ol class="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <li class="flex gap-2">
              <span class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              Open the Hevy app and go to <strong>Profile → Settings</strong>
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              Tap <strong>Export Data</strong> and choose <strong>CSV</strong>
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              Save the <code class="bg-neutral-100 dark:bg-dark-surface px-1.5 py-0.5 rounded text-xs">workout_data.csv</code> file
            </li>
            <li class="flex gap-2">
              <span class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              Upload it here — we'll automatically match exercises and import everything
            </li>
          </ol>
        </div>
      </Show>
    </div>
  )
}
