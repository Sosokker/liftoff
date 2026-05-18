import { createSignal, createEffect } from 'solid-js'

// Always dark mode
const [isDark, setIsDark] = createSignal<boolean>(true)

// Apply theme to document
createEffect(() => {
  document.documentElement.classList.add('dark')
})

export function useTheme() {
  return { isDark, setIsDark, toggle: () => {} }
}
