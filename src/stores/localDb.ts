import { createSignal } from 'solid-js'

// Local IndexedDB for offline support
const DB_NAME = 'liftoff_offline'
const DB_VERSION = 2

let db: IDBDatabase | null = null

export async function initLocalDB(): Promise<IDBDatabase> {
  if (db) return db
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      
      if (!database.objectStoreNames.contains('workouts')) {
        database.createObjectStore('workouts', { keyPath: 'localId', autoIncrement: true })
      }
      if (!database.objectStoreNames.contains('exercises')) {
        const exStore = database.createObjectStore('exercises', { keyPath: 'id' })
        exStore.createIndex('muscle_group', 'muscle_group', { unique: false })
      }
      if (!database.objectStoreNames.contains('routines')) {
        database.createObjectStore('routines', { keyPath: 'localId', autoIncrement: true })
      }
      if (!database.objectStoreNames.contains('measurements')) {
        database.createObjectStore('measurements', { keyPath: 'localId', autoIncrement: true })
      }
      if (!database.objectStoreNames.contains('sync_queue')) {
        const syncStore = database.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true })
        syncStore.createIndex('status', 'status', { unique: false })
        syncStore.createIndex('endpoint', 'endpoint', { unique: false })
      }
      if (!database.objectStoreNames.contains('cache')) {
        const cacheStore = database.createObjectStore('cache', { keyPath: 'key' })
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!database.objectStoreNames.contains('photos')) {
        database.createObjectStore('photos', { keyPath: 'localId', autoIncrement: true })
      }
    }
  })
}

export async function saveToStore(storeName: string, data: any, key?: string | number): Promise<void> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = key ? store.put(data, key) : store.put(data)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getFromStore(storeName: string, id?: string | number): Promise<any> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readonly')
    const store = transaction.objectStore(storeName)
    
    if (id !== undefined) {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    } else {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }
  })
}

export async function deleteFromStore(storeName: string, id: string | number): Promise<void> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearStore(storeName: string): Promise<void> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([storeName], 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Online status
export const [isOnline, setIsOnline] = createSignal(navigator.onLine)

window.addEventListener('online', () => {
  setIsOnline(true)
  // Trigger sync when back online
  setTimeout(() => processSyncQueue(), 500)
})
window.addEventListener('offline', () => setIsOnline(false))

export function useOnline() {
  return { isOnline }
}

// Sync queue operations
interface SyncItem {
  id?: number
  method: string
  endpoint: string
  body: any
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  createdAt: string
  retryCount: number
}

export async function addToSyncQueue(method: string, endpoint: string, body: any): Promise<void> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    const request = store.add({
      method,
      endpoint,
      body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0
    })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getSyncQueue(status?: string): Promise<SyncItem[]> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['sync_queue'], 'readonly')
    const store = transaction.objectStore('sync_queue')
    
    if (status) {
      const index = store.index('status')
      const request = index.getAll(status)
      request.onsuccess = () => resolve(request.result as SyncItem[])
      request.onerror = () => reject(request.error)
    } else {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as SyncItem[])
      request.onerror = () => reject(request.error)
    }
  })
}

export async function updateSyncItem(id: number, updates: Partial<SyncItem>): Promise<void> {
  const database = await initLocalDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['sync_queue'], 'readwrite')
    const store = transaction.objectStore('sync_queue')
    const getRequest = store.get(id)
    
    getRequest.onsuccess = () => {
      const item = getRequest.result
      if (item) {
        Object.assign(item, updates)
        const putRequest = store.put(item)
        putRequest.onsuccess = () => resolve()
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        resolve()
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export async function removeFromSyncQueue(id: number): Promise<void> {
  await deleteFromStore('sync_queue', id)
}

// Cache operations
interface CacheEntry {
  key: string
  data: any
  timestamp: number
}

export async function setCache(key: string, data: any): Promise<void> {
  const entry: CacheEntry = {
    key,
    data,
    timestamp: Date.now()
  }
  await saveToStore('cache', entry)
}

export async function getCache(key: string): Promise<any> {
  const result = await getFromStore('cache', key)
  return result?.data || null
}

export async function clearOldCache(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const database = await initLocalDB()
  const cutoff = Date.now() - maxAgeMs
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['cache'], 'readwrite')
    const store = transaction.objectStore('cache')
    const index = store.index('timestamp')
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff))
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      } else {
        resolve()
      }
    }
    request.onerror = () => reject(request.error)
  })
}

// Sync status signal
export const [syncStatus, setSyncStatus] = createSignal<'idle' | 'syncing' | 'error' | 'offline'>('idle')
export const [pendingCount, setPendingCount] = createSignal(0)

// Process sync queue
export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine) {
    setSyncStatus('offline')
    return
  }
  
  const { token } = await import('./authStore.js')
  const currentToken = token()
  if (!currentToken) return
  
  const pending = await getSyncQueue('pending')
  const failed = await getSyncQueue('failed')
  const items = [...pending, ...failed.filter(f => f.retryCount < 3)]
  
  if (items.length === 0) {
    setSyncStatus('idle')
    setPendingCount(0)
    return
  }
  
  setSyncStatus('syncing')
  setPendingCount(items.length)
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  
  for (const item of items) {
    try {
      await updateSyncItem(item.id!, { status: 'syncing' })
      
      const response = await fetch(`${API_URL}${item.endpoint}`, {
        method: item.method,
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item.body)
      })
      
      if (response.ok) {
        await removeFromSyncQueue(item.id!)
      } else if (response.status === 401) {
        // Auth expired, stop syncing
        setSyncStatus('error')
        await updateSyncItem(item.id!, { status: 'failed', retryCount: item.retryCount + 1 })
        break
      } else {
        await updateSyncItem(item.id!, { status: 'failed', retryCount: item.retryCount + 1 })
      }
    } catch (error) {
      await updateSyncItem(item.id!, { status: 'failed', retryCount: item.retryCount + 1 })
    }
  }
  
  const remaining = await getSyncQueue('pending')
  const remainingFailed = await getSyncQueue('failed')
  const totalRemaining = remaining.length + remainingFailed.length
  
  setPendingCount(totalRemaining)
  setSyncStatus(totalRemaining > 0 ? 'error' : 'idle')
}

// Offline-aware API wrapper
export async function offlineApiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const { token } = await import('./authStore.js')
  const currentToken = token()
  if (!currentToken) throw new Error('Not authenticated')
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  const cacheKey = `${endpoint}_${options.method || 'GET'}`
  
  if (navigator.onLine) {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 401) {
        const { logout } = await import('./authStore.js')
        logout()
        throw new Error('Session expired')
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache GET responses
      if (!options.method || options.method === 'GET') {
        await setCache(cacheKey, data)
      }
      
      return data
    } catch (error) {
      // Network error but browser thinks online - try cache
      if (!options.method || options.method === 'GET') {
        const cached = await getCache(cacheKey)
        if (cached) {
          console.log('Serving cached data for', endpoint)
          return cached
        }
      }
      throw error
    }
  } else {
    // Offline mode
    if (!options.method || options.method === 'GET') {
      const cached = await getCache(cacheKey)
      if (cached) return cached
      throw new Error('No cached data available offline')
    } else {
      // Queue mutation for later sync
      await addToSyncQueue(options.method, endpoint, JSON.parse(options.body as string || '{}'))
      setSyncStatus('offline')
      setPendingCount(c => c + 1)
      
      // Return optimistic response
      return { queued: true, message: 'Saved offline. Will sync when online.' }
    }
  }
}

// Auto-sync interval
let syncInterval: number | null = null

export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) clearInterval(syncInterval)
  syncInterval = window.setInterval(() => {
    if (navigator.onLine && pendingCount() > 0) {
      processSyncQueue()
    }
  }, intervalMs)
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

// Start auto-sync on module load
startAutoSync()
