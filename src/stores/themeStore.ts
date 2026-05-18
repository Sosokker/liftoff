import { createSignal, createEffect } from 'solid-js'

function getInitialTheme(): boolean {
  const saved = localStorage.getItem('liftoff_theme')
  if (saved) return saved === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Theme store
const [isDark, setIsDark] = createSignal<boolean>(getInitialTheme())

// Apply theme to document
createEffect(() => {
  const dark = isDark()
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('liftoff_theme', dark ? 'dark' : 'light')
})

export function useTheme() {
  return { isDark, setIsDark, toggle: () => setIsDark(!isDark()) }
}
