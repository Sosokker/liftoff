import { createSignal, createEffect } from 'solid-js'
import type { User } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create reactive signals
const [token, setToken] = createSignal<string | null>(localStorage.getItem('liftoff_token'))
const [user, setUser] = createSignal<User | null>(null)
const [isLoading, setIsLoading] = createSignal(true)

// Create effect to sync token with localStorage
createEffect(() => {
  const currentToken = token()
  if (currentToken) {
    localStorage.setItem('liftoff_token', currentToken)
  } else {
    localStorage.removeItem('liftoff_token')
  }
})

// Verify token on startup
async function initAuth() {
  const storedToken = localStorage.getItem('liftoff_token')
  if (storedToken) {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${storedToken}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setToken(storedToken)
        // Pre-cache critical data for offline use
        prefetchCriticalData()
      } else {
        localStorage.removeItem('liftoff_token')
      }
    } catch (error) {
      console.error('Auth init error:', error)
    }
  }
  setIsLoading(false)
}

  initAuth()

// Pre-cache critical data when auth is ready
export async function prefetchCriticalData() {
  try {
    const { offlineApiFetch } = await import('./localDb.js')
    await Promise.all([
      offlineApiFetch('/api/exercises').catch(() => null),
      offlineApiFetch('/api/routines').catch(() => null),
    ])
  } catch {
    // Offline wrapper not available yet
  }
}

export function useAuth() {
  return { token, user, isLoading }
}

// Export token signal directly for offline sync
export { token, setToken }

export async function register(username: string, email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  })
  
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Registration failed')
  
  setToken(data.token)
  setUser(data.user)
  return data
}

export async function login(username: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Login failed')
  
  setToken(data.token)
  setUser(data.user)
  return data
}

export function logout() {
  setToken(null)
  setUser(null)
  localStorage.removeItem('liftoff_token')
}

// Handle OAuth callback token
export async function handleOAuthToken(tokenStr: string) {
  setToken(tokenStr)
  
  // Fetch user info
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenStr}` }
    })
    if (response.ok) {
      const userData = await response.json()
      setUser(userData)
      return userData
    }
  } catch (error) {
    console.error('OAuth user fetch error:', error)
  }
  return null
}

// Legacy apiFetch - uses offline wrapper when available
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  // For auth endpoints that shouldn't use offline queue
  if (endpoint.startsWith('/api/auth')) {
    return directApiFetch(endpoint, options)
  }
  
  // Try to use offline wrapper
  try {
    const { offlineApiFetch } = await import('./localDb.js')
    return offlineApiFetch(endpoint, options)
  } catch {
    // Fallback to direct fetch
    return directApiFetch(endpoint, options)
  }
}

// Direct API fetch (no offline support)
export async function directApiFetch(endpoint: string, options: RequestInit = {}) {
  const currentToken = token()
  if (!currentToken) throw new Error('Not authenticated')
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    }
  })
  
  if (response.status === 401) {
    logout()
    throw new Error('Session expired')
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}
