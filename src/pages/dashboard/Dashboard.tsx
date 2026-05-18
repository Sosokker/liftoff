import { createSignal, createEffect, Show, For } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useAuth, apiFetch } from '../../stores/authStore'
import {
  Dumbbell,
  Flame,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Settings,
  Play
} from 'lucide-solid'

// ─── Helpers ───

function getMonthLabels(weeks: Date[][]) {
  const labels: { label: string; index: number }[] = []
  let currentMonth = -1
  weeks.forEach((week, i) => {
    const firstDay = week[0]
    if (firstDay.getMonth() !== currentMonth) {
      currentMonth = firstDay.getMonth()
      labels.push({
        label: firstDay.toLocaleDateString('en', { month: 'short' }),
        index: i
      })
    }
  })
  return labels
}

function getWeeksForGrid(monthsBack = 6) {
  const weeks: Date[][] = []
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsBack)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  let currentWeek: Date[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    currentWeek.push(new Date(d))
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      const last = new Date(currentWeek[currentWeek.length - 1])
      last.setDate(last.getDate() + 1)
      currentWeek.push(last)
    }
    weeks.push(currentWeek)
  }
  return weeks
}

function formatDateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function getDayName(dayIndex: number) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[dayIndex]
}

// ─── Contribution Grid ───

function ContributionGrid(props: {
  workoutDates: Set<string>
  onDayClick?: (date: Date) => void
}) {
  const weeks = getWeeksForGrid(6)
  const monthLabels = getMonthLabels(weeks)
  const today = formatDateKey(new Date())

  const getIntensity = (date: Date) => {
    const key = formatDateKey(date)
    if (props.workoutDates.has(key)) return 'high'
    return 'none'
  }

  return (
    <div>
      {/* Month labels */}
      <div class="flex mb-1 pl-8">
        {monthLabels.map((m) => (
          <span
            class="text-[10px] text-neutral-500 absolute"
            style={{ left: `${m.index * 16 + 32}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div class="flex gap-[3px]">
        {/* Day labels */}
        <div class="flex flex-col gap-[3px] mr-1">
          {[1, 3, 5].map(dayIdx => (
            <span class="text-[9px] text-neutral-500 h-[12px] leading-[12px]">
              {getDayName(dayIdx)}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div class="flex gap-[3px] overflow-x-auto pb-1">
          <For each={weeks}>
            {(week) => (
              <div class="flex flex-col gap-[3px]">
                <For each={week}>
                  {(day) => {
                    const intensity = getIntensity(day)
                    const isToday = formatDateKey(day) === today
                    return (
                      <button
                        onClick={() => props.onDayClick?.(day)}
                        class={`w-[12px] h-[12px] rounded-sm transition-all duration-200 ${
                          intensity === 'high'
                            ? 'bg-[#ff6b6b]'
                            : isToday
                              ? 'bg-[#ff6b6b]/60 ring-1 ring-[#ff6b6b]'
                              : 'bg-[#262626]'
                        }`}
                        title={day.toLocaleDateString()}
                      />
                    )
                  }}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

// ─── Monthly Calendar ───

function MonthlyCalendar(props: {
  year: number
  month: number
  workoutDates: Set<string>
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}) {
  const daysInMonth = new Date(props.year, props.month + 1, 0).getDate()
  const firstDayOfMonth = new Date(props.year, props.month, 1).getDay()

  const isWorkoutDay = (day: number) => {
    const key = `${props.year}-${String(props.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return props.workoutDates.has(key)
  }

  const isSelected = (day: number) => {
    if (!props.selectedDate) return false
    return (
      props.selectedDate.getDate() === day &&
      props.selectedDate.getMonth() === props.month &&
      props.selectedDate.getFullYear() === props.year
    )
  }

  const isToday = (day: number) => {
    const now = new Date()
    return (
      now.getDate() === day &&
      now.getMonth() === props.month &&
      now.getFullYear() === props.year
    )
  }

  return (
    <div>
      {/* Day headers */}
      <div class="grid grid-cols-7 gap-1 mb-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div class="text-center text-[10px] text-neutral-500 font-medium">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div class="grid grid-cols-7 gap-1">
        {/* Offset for first day (Mon=0 in our display) */}
        <For each={Array((firstDayOfMonth + 6) % 7).fill(0)}>
          {() => <div />}
        </For>

        <For each={Array(daysInMonth).fill(0).map((_, i) => i + 1)}>
          {(day) => {
            const hasWorkout = isWorkoutDay(day)
            const selected = isSelected(day)
            const today = isToday(day)

            return (
              <button
                onClick={() => props.onSelectDate(new Date(props.year, props.month, day))}
                class={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all duration-150 ${
                  selected
                    ? 'bg-[#ff6b6b] text-white'
                    : today
                      ? 'bg-white/10 text-white'
                      : hasWorkout
                        ? 'text-white'
                        : 'text-neutral-400 hover:bg-white/5'
                }`}
              >
                {day}
                {hasWorkout && !selected && (
                  <div class="w-1 h-1 rounded-full bg-[#ff6b6b] mt-0.5" />
                )}
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}

// ─── Main Page ───

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [workoutDates, setWorkoutDates] = createSignal<Set<string>>(new Set())
  const [currentStreak, setCurrentStreak] = createSignal(0)
  const [totalWorkouts, setTotalWorkouts] = createSignal(0)
  const [isLoading, setIsLoading] = createSignal(true)

  const [calendarMonth, setCalendarMonth] = createSignal(new Date().getMonth())
  const [calendarYear, setCalendarYear] = createSignal(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(new Date())

  createEffect(async () => {
    if (!user()) {
      navigate('/login')
      return
    }

    try {
      const [datesRes, streakRes] = await Promise.all([
        apiFetch('/api/analytics/workout-dates?months=6'),
        apiFetch('/api/analytics/streak')
      ])

      setWorkoutDates(new Set(datesRes as string[]))
      setCurrentStreak(streakRes.currentStreak || 0)
      setTotalWorkouts(streakRes.totalWorkouts || 0)
    } catch (error) {
      console.error('Dashboard load error:', error)
    } finally {
      setIsLoading(false)
    }
  })

  function changeMonth(delta: number) {
    let newMonth = calendarMonth() + delta
    let newYear = calendarYear()
    if (newMonth > 11) {
      newMonth = 0
      newYear++
    } else if (newMonth < 0) {
      newMonth = 11
      newYear--
    }
    setCalendarMonth(newMonth)
    setCalendarYear(newYear)
  }

  function goToWorkout() {
    navigate('/workout')
  }

  const monthYearLabel = () => {
    return new Date(calendarYear(), calendarMonth()).toLocaleDateString('en', {
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <div class="px-4 pt-4 pb-6 space-y-6">
      <Show when={!isLoading()} fallback={
        <div class="flex justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      }>
      {/* Header */}
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center">
            <Dumbbell class="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 class="text-xl font-bold">Fitness</h1>
            <p class="text-sm text-neutral-500">Exercise Lets go</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/tools')}
          class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          aria-label="Tools"
        >
          <Settings class="w-5 h-5 text-neutral-400" />
        </button>
      </div>

      {/* Activity Grid Card */}
      <div class="card p-4 space-y-4">
        <ContributionGrid
          workoutDates={workoutDates()}
          onDayClick={(date) => {
            setCalendarMonth(date.getMonth())
            setCalendarYear(date.getFullYear())
            setSelectedDate(date)
          }}
        />

        {/* Stats Row */}
        <div class="flex items-center gap-3">
          <div class="pill">
            No Streak Goal
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1f1f1f] border border-[#333]">
            <Flame class="w-3.5 h-3.5 text-[#ff6b6b]" />
            <span class="text-xs font-medium">{currentStreak()}</span>
          </div>
          <div class="flex-1" />
          <button
            onClick={goToWorkout}
            class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Pencil class="w-4 h-4 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Start Workout CTA */}
      <button
        onClick={goToWorkout}
        class="w-full py-4 bg-white text-black rounded-2xl font-semibold text-sm
               flex items-center justify-center gap-2
               active:scale-[0.97] transition-transform"
      >
        <Play class="w-4 h-4" />
        Start Workout
      </button>

      {/* Monthly Calendar */}
      <div class="card p-4">
        <MonthlyCalendar
          year={calendarYear()}
          month={calendarMonth()}
          workoutDates={workoutDates()}
          selectedDate={selectedDate()}
          onSelectDate={setSelectedDate}
        />

        {/* Month Navigation */}
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-[#262626]">
          <div class="flex items-center gap-2 text-sm font-medium">
            <span class="text-neutral-400">{monthYearLabel()}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <button
              onClick={() => changeMonth(1)}
              class="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div class="grid grid-cols-2 gap-3">
        <div class="card p-4">
          <p class="text-xs text-neutral-500 mb-1">Total Workouts</p>
          <p class="text-2xl font-bold">{totalWorkouts()}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-neutral-500 mb-1">Current Streak</p>
          <p class="text-2xl font-bold">{currentStreak()}</p>
          <p class="text-xs text-neutral-500">days</p>
        </div>
      </div>
      </Show>
    </div>
  )
}
