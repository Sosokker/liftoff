import { useLocation, useNavigate } from '@solidjs/router'
import { Show, type JSX } from 'solid-js'
import { useAuth, logout } from '../../stores/authStore'
import { useTheme } from '../../stores/themeStore'
import SyncStatus from '../ui/SyncStatus'
import { 
  Home, 
  Dumbbell, 
  ClipboardList, 
  TrendingUp, 
  Wrench,
  Moon, 
  Sun,
  LogOut,
  Menu
} from 'lucide-solid'

export default function AppLayout(props: { children: JSX.Element }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDark, toggle } = useTheme()

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
    <div class="min-h-screen bg-neutral-50 dark:bg-dark-bg text-neutral-900 dark:text-white">
      {/* Header */}
      <Show when={!isAuthPage()}>
        <header class="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-neutral-100 dark:border-dark-border safe-area-inset-top">
          <div class="flex items-center justify-between px-4 h-14">
            <div class="flex items-center gap-2">
              <Show when={location.pathname !== '/'} fallback={
                <h1 class="text-lg font-bold text-primary">Liftoff</h1>
              }>
                <button onClick={() => navigate('/')} class="p-2 -ml-2">
                  <Menu class="w-5 h-5" />
                </button>
                <h1 class="text-lg font-semibold capitalize">
                  {location.pathname.split('/')[1] || 'Home'}
                </h1>
              </Show>
            </div>
            <div class="flex items-center gap-2">
              <Show when={user()}>
                <SyncStatus />
              </Show>
              <button 
                onClick={toggle}
                class="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-dark-surface transition-colors"
              >
                <Show when={isDark()} fallback={<Sun class="w-5 h-5" />}>
                  <Moon class="w-5 h-5" />
                </Show>
              </button>
              <Show when={user()}>
                <button 
                  onClick={() => { logout(); navigate('/login') }}
                  class="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-dark-surface transition-colors"
                >
                  <LogOut class="w-5 h-5" />
                </button>
              </Show>
            </div>
          </div>
        </header>
      </Show>

      {/* Main Content */}
      <main class={`${isAuthPage() ? '' : 'pt-14 pb-20'}`}>
        {props.children}
      </main>

      {/* Bottom Navigation */}
      <Show when={!isAuthPage() && user()}>
        <nav class="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-t border-neutral-100 dark:border-dark-border safe-area-inset-bottom">
          <div class="flex items-center justify-around py-1">
            {navItems.map(item => (
              <button
                onClick={() => navigate(item.path)}
                class={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <item.icon class="w-6 h-6" />
                <span class="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </Show>
    </div>
  )
}
