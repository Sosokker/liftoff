import { createSignal, Show, For } from 'solid-js'
import { apiFetch } from '../../stores/authStore'
import { ArrowLeft, Calculator } from 'lucide-solid'
import { useNavigate } from '@solidjs/router'

export default function PlateCalculatorPage() {
  const navigate = useNavigate()
  const [targetWeight, setTargetWeight] = createSignal('')
  const [barWeight, setBarWeight] = createSignal('45')
  const [unit, setUnit] = createSignal<'lbs' | 'kg'>('lbs')
  const [result, setResult] = createSignal<any>(null)

  async function calculate(e: Event) {
    e.preventDefault()
    
    try {
      const data = await apiFetch('/api/tools/plate-calculator', {
        method: 'POST',
        body: JSON.stringify({
          targetWeight: parseFloat(targetWeight()),
          barWeight: parseFloat(barWeight()),
          unit: unit()
        })
      })
      setResult(data)
    } catch (error: any) {
      alert(error.message || 'Calculation failed')
    }
  }

  return (
    <div class="px-4 py-6">
      <button 
        onClick={() => navigate('/tools')}
        class="flex items-center gap-1 text-sm text-neutral-400 mb-4"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to tools
      </button>

      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <Calculator class="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 class="text-xl font-bold">Plate Calculator</h2>
          <p class="text-sm text-neutral-400">Calculate barbell loading</p>
        </div>
      </div>

      <form onSubmit={calculate} class="card p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Unit</label>
          <div class="flex gap-2">
            <button
              type="button"
              onClick={() => setUnit('lbs')}
              class={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                unit() === 'lbs' 
                  ? 'bg-primary text-white' 
                  : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
              }`}
            >
              Lbs
            </button>
            <button
              type="button"
              onClick={() => setUnit('kg')}
              class={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                unit() === 'kg' 
                  ? 'bg-primary text-white' 
                  : 'bg-[#262626] bg-[#1a1a1a] text-neutral-300 text-neutral-400'
              }`}
            >
              Kg
            </button>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Target Weight ({unit()})</label>
          <input
            type="number"
            value={targetWeight()}
            onInput={(e) => setTargetWeight(e.currentTarget.value)}
            class="input"
            placeholder={`e.g., ${unit() === 'lbs' ? '225' : '100'}`}
            step={unit() === 'lbs' ? '5' : '2.5'}
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Bar Weight ({unit()})</label>
          <input
            type="number"
            value={barWeight()}
            onInput={(e) => setBarWeight(e.currentTarget.value)}
            class="input"
            placeholder={`e.g., ${unit() === 'lbs' ? '45' : '20'}`}
            step={unit() === 'lbs' ? '5' : '2.5'}
            required
          />
        </div>

        <button type="submit" class="btn-primary w-full">
          Calculate
        </button>
      </form>

      <Show when={result()}>
        <div class="card p-4 mt-4">
          <h3 class="font-semibold mb-3">Result</h3>
          
          <div class="space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-neutral-400">Target</span>
              <span class="font-semibold">{result().targetWeight} {unit()}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-neutral-400">Bar</span>
              <span class="font-semibold">{result().barWeight} {unit()}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-neutral-400">Per side</span>
              <span class="font-semibold">{result().weightPerSide.toFixed(1)} {unit()}</span>
            </div>
            
            <div class="border-t border-[#262626] pt-3">
              <p class="text-sm font-medium mb-2">Plates per side:</p>
              <Show when={result().plates.length > 0} fallback={
                <p class="text-sm text-neutral-500">Bar only</p>
              }>
                <div class="space-y-1">
                  <For each={result().plates}>
                    {(plate: any) => (
                      <div class="flex justify-between text-sm">
                        <span>{plate.weight} {unit()}</span>
                        <span class="font-semibold">× {plate.count}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <Show when={result().remainder > 0}>
              <p class="text-xs text-yellow-400 text-yellow-400">
                Remainder: {result().remainder.toFixed(1)} {unit()} (adjust with micro plates)
              </p>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
