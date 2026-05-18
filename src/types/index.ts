export interface User {
  id: number
  username: string
  email: string
  createdAt?: string
}

export interface Exercise {
  id: number
  user_id?: number
  name: string
  muscle_group: string
  equipment?: string
  instructions?: string
  is_custom: number
}

export interface RoutineExercise {
  id: number
  routine_id: number
  exercise_id: number
  order_index: number
  target_sets: number
  target_reps: number
  rest_seconds: number
  exercise_name?: string
  muscle_group?: string
  equipment?: string
}

export interface Routine {
  id: number
  user_id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
  exercise_count?: number
  exercises?: RoutineExercise[]
}

export interface Set {
  id?: number
  workout_exercise_id?: number
  set_type: 'warmup' | 'normal' | 'drop_set' | 'failure' | 'superset'
  set_number: number
  reps?: number
  weight?: number
  rpe?: number
  is_completed: boolean
  completed_at?: string
}

export interface WorkoutExercise {
  id?: number
  workout_id?: number
  exercise_id: number
  order_index: number
  notes?: string
  exercise_name?: string
  muscle_group?: string
  equipment?: string
  sets: Set[]
}

export interface Workout {
  id: number
  user_id: number
  routine_id?: number
  name: string
  start_time: string
  end_time?: string
  duration_seconds?: number
  notes?: string
  created_at: string
  exercise_count?: number
  completed_sets?: number
  exercises?: WorkoutExercise[]
}

export interface BodyMeasurement {
  id: number
  user_id: number
  date: string
  weight?: number
  body_fat?: number
  neck?: number
  chest?: number
  waist?: number
  hips?: number
  biceps?: number
  forearms?: number
  thighs?: number
  calves?: number
}

export interface ProgressPhoto {
  id: number
  user_id: number
  date: string
  photo_data?: string
  caption?: string
}

export interface VolumeData {
  date: string
  volume: number
  workout_count: number
}

export interface MuscleDistribution {
  muscle_group: string
  set_count: number
  volume: number
}

export interface StrengthLevel {
  exercise: string
  maxWeight: number
}

export interface PlateResult {
  weight: number
  count: number
  perSide: boolean
}
