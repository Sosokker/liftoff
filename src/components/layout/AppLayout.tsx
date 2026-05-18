import { useLocation, useNavigate } from '@solidjs/router'
import { Show, type JSX } from 'solid-js'
import { useAuth, logout } from '../../stores/authStore'
import {
  Home,
  Dumbbell,
  ClipboardList,
  TrendingUp,
  Wrench,
  LogOut
} from 'lucide-solid'

export default function AppLayout(props: { children: JSX.Element }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isAuthPage = () => ['/login', '/register'].includes(location.pathname)
  const isActive = (path: string) => location.pathname === path

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/workout', icon: Dumbbell, label: 'Workout' },
    { path: '/routines', icon: ClipboardList, label: 'Routines' },
    { path: '/analytics', icon: TrendingUp, label: 'Stats' },
    { path: '/tools', icon: Wrench, label: 'Tools' },
  ]

  return (
    <div class="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <Show when={!isAuthPage() && user()}>
        <header class="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md safe-area-inset-top">
          <div class="flex items-center justify-between px-4 h-14">
            <Show when={location.pathname === '/'} fallback={
              <button
                onClick={() => navigate('/')}
                class="flex items-center gap-2"
              >
                <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Dumbbell class="w-4 h-4 text-white" />
                </div>
                <span class="text-sm font-semibold">Liftoff</span>
              </button>
            }>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Dumbbell class="w-4 h-4 text-white" />
                </div>
                <span class="text-sm font-semibold">Liftoff</span>
              </div>
            </Show>

            <div class="flex items-center gap-2">
              <button
                onClick={() => { logout(); navigate('/login') }}
                class="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <LogOut class="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>
        </header>
      </Show>

      {/* Main Content */}
      <main class={`${isAuthPage() ? '' : 'pt-14 pb-24'}`}>
        {props.children}
      </main>

      {/* Bottom Navigation */}
      <Show when={!isAuthPage() && user()}>
        <nav class="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-[#1a1a1a] safe-area-inset-bottom">
          <div class="flex items-center justify-around py-2 max-w-md mx-auto">
            {navItems.map(item => (
              <button
                onClick={() => navigate(item.path)}
                class={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <div class={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isActive(item.path) ? 'bg-white/10' : ''}`}>
                  <item.icon class="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </nav>
      </Show>
    </div>
  )
}
