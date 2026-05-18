import { useNavigate } from '@solidjs/router'
import { Calculator, Download, ArrowRight, Upload } from 'lucide-solid'

export default function ToolsPage() {
  const navigate = useNavigate()

  const tools = [
    {
      title: 'Plate Calculator',
      description: 'Calculate which plates to load for your target weight',
      icon: Calculator,
      path: '/tools/plate-calculator',
      color: 'bg-primary/10 text-primary'
    },
    {
      title: 'Import from Hevy',
      description: 'Import your workout history from a Hevy CSV export',
      icon: Upload,
      path: '/tools/import-hevy',
      color: 'bg-blue-100 text-blue-600 bg-blue-900/30 dark:text-blue-400'
    },
    {
      title: 'Export Data',
      description: 'Download your workout history as a CSV file',
      icon: Download,
      path: '/api/tools/export',
      color: 'bg-accent/10 text-accent',
      isExternal: true
    }
  ]

  return (
    <div class="px-4 py-6">
      <h2 class="text-xl font-bold mb-6">Tools</h2>

      <div class="space-y-3">
        {tools.map((tool) => (
          <button 
            onClick={() => {
              if (tool.isExternal) {
                window.open(tool.path, '_blank')
              } else {
                navigate(tool.path)
              }
            }}
            class="card p-4 w-full text-left active:bg-[#1a1a1a] active:bg-[#1a1a1a] transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class={`w-12 h-12 rounded-xl flex items-center justify-center ${tool.color}`}>
                <tool.icon class="w-6 h-6" />
              </div>
              <div class="flex-1">
                <h3 class="font-semibold">{tool.title}</h3>
                <p class="text-sm text-neutral-500 text-neutral-400">{tool.description}</p>
              </div>
              <ArrowRight class="w-5 h-5 text-neutral-400" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
