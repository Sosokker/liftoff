import { Show } from 'solid-js'
import { useOnline, syncStatus, pendingCount, processSyncQueue } from '../../stores/localDb'
import { CloudOff, RefreshCw, AlertCircle } from 'lucide-solid'

export default function SyncStatus() {
  const { isOnline } = useOnline()
  
  const statusText = () => {
    if (!isOnline()) return 'Offline'
    const status = syncStatus()
    if (status === 'syncing') return `Syncing ${pendingCount()} items...`
    if (status === 'error') return `${pendingCount()} pending`
    return null
  }
  
  const statusIcon = () => {
    if (!isOnline()) return <CloudOff class="w-4 h-4" />
    const status = syncStatus()
    if (status === 'syncing') return <RefreshCw class="w-4 h-4 animate-spin" />
    if (status === 'error') return <AlertCircle class="w-4 h-4" />
    return null
  }
  
  const statusColor = () => {
    if (!isOnline()) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    const status = syncStatus()
    if (status === 'syncing') return 'bg-primary/10 text-primary'
    if (status === 'error') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    return ''
  }
  
  return (
    <Show when={statusText()}>
      <button
        onClick={() => {
          if (isOnline() && syncStatus() === 'error') {
            processSyncQueue()
          }
        }}
        class={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
          syncStatus() === 'error' && isOnline() ? 'cursor-pointer hover:opacity-80' : ''
        } ${statusColor()}`}
      >
        {statusIcon()}
        <span>{statusText()}</span>
      </button>
    </Show>
  )
}
