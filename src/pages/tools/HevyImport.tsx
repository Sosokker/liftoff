import { createSignal, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { apiFetch } from '../../stores/authStore'
import { Upload, ArrowLeft, CheckCircle, AlertCircle, FileSpreadsheet, Dumbbell, Calendar } from 'lucide-solid'

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
  const [csvPreview, setCsvPreview] = createSignal<string>('')
  const [isImporting, setIsImporting] = createSignal(false)
  const [result, setResult] = createSignal<ImportResult | null>(null)
  const [error, setError] = createSignal('')
  const [dragActive, setDragActive] = createSignal(false)

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
      setCsvPreview(text.slice(0, 2000)) // Preview first 2000 chars
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
      const data = await apiFetch('/api/tools/import-hevy', {
        method: 'POST',
        body: JSON.stringify({ csvText: text })
      })
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Import failed. Please check your CSV format.')
    } finally {
      setIsImporting(false)
    }
  }

  function reset() {
    setFile(null)
    setCsvPreview('')
    setResult(null)
    setError('')
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

      {/* Loading */}
      <Show when={isImporting()}>
        <div class="card p-8 text-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
          <p class="font-medium">Importing your workouts...</p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            This may take a moment for large files
          </p>
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
