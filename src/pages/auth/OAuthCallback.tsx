import { onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { handleOAuthToken } from '../../stores/authStore'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()

  onMount(async () => {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')
    const error = url.searchParams.get('error')

    if (error) {
      navigate('/login')
      return
    }

    if (token) {
      try {
        await handleOAuthToken(token)
        // Clear the token from URL
        window.history.replaceState({}, document.title, '/')
        navigate('/')
      } catch {
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  })

  return (
    <div class="flex items-center justify-center h-screen bg-[#1a1a1a] bg-[#0a0a0a]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p class="text-neutral-300 text-neutral-400">Completing sign in...</p>
      </div>
    </div>
  )
}
