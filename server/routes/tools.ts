import { Hono } from 'hono'
import { getDb } from '../db.js'
import { jwtVerify } from 'jose'
import '../types.js'

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Muscle group guesser based on exercise name keywords
function guessMuscleGroup(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('bench') || lower.includes('chest') || lower.includes('fly') || lower.includes('pec deck') || lower.includes('butterfly') || lower.includes('push up') || lower.includes('push-up') || lower.includes('chest press') || lower.includes('incline press')) return 'Chest'
  if (lower.includes('squat') || lower.includes('leg press') || lower.includes('leg extension') || lower.includes('leg curl') || lower.includes('lunge') || lower.includes('calf') || lower.includes('hack squat') || lower.includes('goblet squat') || lower.includes('bulgarian')) return 'Legs'
  if (lower.includes('deadlift') || lower.includes('row') || lower.includes('pull up') || lower.includes('pull-up') || lower.includes('pulldown') || lower.includes('lat') || lower.includes('face pull') || lower.includes('t bar') || lower.includes('t-bar') || lower.includes('shrug')) return 'Back'
  if (lower.includes('press') || lower.includes('shoulder') || lower.includes('lateral raise') || lower.includes('front raise') || lower.includes('reverse fly') || lower.includes('arnold') || lower.includes('upright row')) return 'Shoulders'
  if (lower.includes('curl') || lower.includes('hammer')) return 'Biceps'
  if (lower.includes('pushdown') || lower.includes('extension') || lower.includes('skullcrusher') || lower.includes('skull crusher') || lower.includes('dip') || lower.includes('close grip')) return 'Triceps'
  if (lower.includes('crunch') || lower.includes('plank') || lower.includes('leg raise') || lower.includes('russian twist') || lower.includes('ab wheel') || lower.includes('woodchopper') || lower.includes('cable crunch') || lower.includes('hanging knee')) return 'Core'
  if (lower.includes('hip thrust') || lower.includes('glute') || lower.includes('kickback') || lower.includes('step up') || lower.includes('step-up') || lower.includes('swing')) return 'Glutes'
  if (lower.includes('run') || lower.includes('treadmill') || lower.includes('spin') || lower.includes('bike') || lower.includes('elliptical') || lower.includes('rowing machine') || lower.includes('cardio') || lower.includes('warm up') || lower.includes('warmup') || lower.includes('stretch')) return 'Cardio'
  return 'Other'
}

// Extract equipment from Hevy name suffix like "(Barbell)"
function extractEquipment(name: string): string {
  const match = name.match(/\(([^)]+)\)$/)
  return match ? match[1] : 'Other'
}

// Normalize Hevy exercise name by stripping equipment suffix
function normalizeExerciseName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

// Map Hevy set_type to our schema
function mapSetType(hevyType: string): string {
  const mapping: Record<string, string> = {
    'normal': 'normal',
    'warmup': 'warmup',
    'drop_set': 'drop_set',
    'failure': 'failure',
    'myo_rep': 'normal',
    'cluster': 'normal'
  }
  return mapping[hevyType] || 'normal'
}

// Parse Hevy date format: "15 May 2026, 14:15"
function parseHevyDate(dateStr: string): Date | null {
  if (!dateStr) return null
  try {
    // Try direct parse first
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d
    
    // Manual parse: "15 May 2026, 14:15"
    const match = dateStr.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4}),\s+(\d{1,2}):(\d{2})/)
    if (match) {
      const [_, day, monthStr, year, hour, minute] = match
      const months: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      }
      const month = months[monthStr.toLowerCase().substring(0, 3)]
      if (month !== undefined) {
        return new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(minute))
      }
    }
    return null
  } catch {
    return null
  }
}

function getJwtSecret(c: any): Uint8Array {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const tools = new Hono()

tools.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const token = authHeader.split(' ')[1]
    const secret = getJwtSecret(c)
    await jwtVerify(token, secret, { clockTolerance: 60 })
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Plate calculator
// Standard plate weights: 45, 35, 25, 10, 5, 2.5 (in lbs)
// Metric: 20, 15, 10, 5, 2.5, 1.25 (in kg)
tools.post('/plate-calculator', async (c) => {
  const { targetWeight, barWeight, unit } = await c.req.json()
  
  if (!targetWeight || !barWeight) {
    return c.json({ error: 'Target weight and bar weight are required' }, 400)
  }

  const weightPerSide = (targetWeight - barWeight) / 2
  
  if (weightPerSide < 0) {
    return c.json({ error: 'Target weight must be greater than bar weight' }, 400)
  }

  const plates = unit === 'kg' 
    ? [20, 15, 10, 5, 2.5, 1.25, 0.5]
    : [45, 35, 25, 10, 5, 2.5, 1]

  const result = []
  let remaining = weightPerSide

  for (const plate of plates) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate)
      result.push({ weight: plate, count, perSide: true })
      remaining -= count * plate
    }
  }

  return c.json({
    targetWeight,
    barWeight,
    weightPerSide,
    plates: result,
    remainder: remaining
  })
})

// CSV Export
tools.get('/export', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader!.split(' ')[1]
  const secret = getJwtSecret(c)
  const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })
  const userId = payload.userId as number
  
  const db = getDb()
  
  const workoutsResult = await db.execute({
    sql: `
      SELECT 
        w.id,
        w.name,
        w.start_time,
        w.duration_seconds,
        e.name as exercise_name,
        s.set_number,
        s.set_type,
        s.reps,
        s.weight,
        s.rpe
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN exercises e ON we.exercise_id = e.id
      LEFT JOIN sets s ON we.id = s.workout_exercise_id
      WHERE w.user_id = ?
      ORDER BY w.start_time DESC, we.order_index, s.set_number
    `,
    args: [userId]
  })

  // Generate CSV
  const headers = ['Workout ID', 'Workout Name', 'Date', 'Duration (sec)', 'Exercise', 'Set', 'Type', 'Reps', 'Weight', 'RPE']
  const rows = workoutsResult.rows.map(row => [
    row.id,
    row.name,
    row.start_time,
    row.duration_seconds,
    row.exercise_name,
    row.set_number,
    row.set_type,
    row.reps,
    row.weight,
    row.rpe
  ].map(v => `"${v || ''}"`).join(','))

  const csv = [headers.join(','), ...rows].join('\n')
  
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename="workouts-export.csv"')
  return c.body(csv)
})

// ───────────────────────────────────────────────
// Batched Hevy import (avoids "Too many subrequests")
// ───────────────────────────────────────────────

interface HevySet {
  setType: string
  setIndex: number
  reps: number | null
  weightKg: number | null
  rpe: number | null
}

interface HevyExercise {
  title: string
  notes: string
  sets: HevySet[]
}

interface HevyWorkout {
  title: string
  startTime: string // ISO
  endTime: string | null // ISO
  description: string
  exercises: HevyExercise[]
}

tools.post('/import-hevy-batch', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader!.split(' ')[1]
  const secret = getJwtSecret(c)
  const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })
  const userId = payload.userId as number

  const body = await c.req.json() as { workouts: HevyWorkout[] }
  const chunk = body.workouts || []
  if (!Array.isArray(chunk) || chunk.length === 0) {
    return c.json({ error: 'workouts array is required' }, 400)
  }

  const db = getDb()

  // 1️⃣  Fetch existing exercises  (1 subrequest)
  const existing = await db.execute({
    sql: 'SELECT id, name FROM exercises',
    args: []
  })
  const exerciseMap = new Map<string, { id: number; name: string }>()
  const normalizedMap = new Map<string, { id: number }>()
  for (const row of existing.rows) {
    const name = String(row.name)
    const lower = name.toLowerCase()
    exerciseMap.set(lower, { id: Number(row.id), name })
    const norm = normalizeExerciseName(lower)
    if (!normalizedMap.has(norm)) normalizedMap.set(norm, { id: Number(row.id) })
  }

  // Resolve / create every exercise referenced in this chunk
  const exerciseIdByTitle = new Map<string, number>() // original Hevy title → our exercise id
  const toCreate: string[] = []

  for (const w of chunk) {
    for (const ex of w.exercises) {
      const key = ex.title.toLowerCase()
      if (exerciseIdByTitle.has(key)) continue

      const exact = exerciseMap.get(key)
      const norm = normalizedMap.get(normalizeExerciseName(key))
      if (exact) {
        exerciseIdByTitle.set(key, exact.id)
      } else if (norm) {
        exerciseIdByTitle.set(key, norm.id)
      } else {
        // fuzzy substring match
        let found = false
        for (const [existingNorm, info] of normalizedMap) {
          if (existingNorm.includes(normalizeExerciseName(key)) || normalizeExerciseName(key).includes(existingNorm)) {
            exerciseIdByTitle.set(key, info.id)
            found = true
            break
          }
        }
        if (!found) toCreate.push(ex.title)
      }
    }
  }

  // 2️⃣  Batch-create missing exercises  (1 subrequest)
  let exercisesCreated = 0
  if (toCreate.length > 0) {
    const stmts = toCreate.map(title => ({
      sql: 'INSERT INTO exercises (user_id, name, muscle_group, equipment, instructions, is_custom) VALUES (?, ?, ?, ?, ?, 1) RETURNING id, name',
      args: [userId, title, guessMuscleGroup(title), extractEquipment(title), null]
    }))
    const created = await db.batch(stmts)
    for (let i = 0; i < created.length; i++) {
      const row = created[i].rows[0]
      const id = Number(row.id)
      const name = String(row.name)
      const key = name.toLowerCase()
      exerciseIdByTitle.set(key, id)
      exerciseMap.set(key, { id, name })
      normalizedMap.set(normalizeExerciseName(key), { id })
      exercisesCreated++
    }
  }

  // 3️⃣  Batch-insert workouts  (1 subrequest)
  const workoutStmts = chunk.map(w => {
    const duration = w.endTime
      ? Math.floor((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000)
      : null
    return {
      sql: 'INSERT INTO workouts (user_id, name, start_time, end_time, duration_seconds, notes) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      args: [userId, w.title, w.startTime, w.endTime, duration, w.description || null]
    }
  })
  const workoutResults = await db.batch(workoutStmts)
  const workoutIds = workoutResults.map(r => Number(r.rows[0].id))

  // 4️⃣  Batch-insert workout_exercises  (1 subrequest)
  const weStmts: { sql: string; args: (string | number | null)[] }[] = []
  for (let wi = 0; wi < chunk.length; wi++) {
    const w = chunk[wi]
    const workoutId = workoutIds[wi]
    for (let ei = 0; ei < w.exercises.length; ei++) {
      const ex = w.exercises[ei]
      const exerciseId = exerciseIdByTitle.get(ex.title.toLowerCase())!
      weStmts.push({
        sql: 'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes) VALUES (?, ?, ?, ?) RETURNING id',
        args: [workoutId, exerciseId, ei, ex.notes || null]
      })
    }
  }
  const weResults = await db.batch(weStmts)

  // Map workout_exercise IDs back to their (workoutIndex, exerciseIndex)
  let weCursor = 0
  const weIdByPath = new Map<string, number>() // "wi:ei" → workout_exercise_id
  for (let wi = 0; wi < chunk.length; wi++) {
    for (let ei = 0; ei < chunk[wi].exercises.length; ei++) {
      weIdByPath.set(`${wi}:${ei}`, Number(weResults[weCursor].rows[0].id))
      weCursor++
    }
  }

  // 5️⃣  Batch-insert sets  (1 subrequest)
  const setStmts: { sql: string; args: (string | number | null)[] }[] = []
  for (let wi = 0; wi < chunk.length; wi++) {
    const w = chunk[wi]
    for (let ei = 0; ei < w.exercises.length; ei++) {
      const ex = w.exercises[ei]
      const weId = weIdByPath.get(`${wi}:${ei}`)!
      // Sort by setIndex to preserve order
      const sortedSets = [...ex.sets].sort((a, b) => a.setIndex - b.setIndex)
      for (let si = 0; si < sortedSets.length; si++) {
        const s = sortedSets[si]
        setStmts.push({
          sql: `
            INSERT INTO sets
            (workout_exercise_id, set_type, set_number, reps, weight, rpe, is_completed, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            weId,
            mapSetType(s.setType),
            si + 1,
            s.reps,
            s.weightKg,
            s.rpe,
            1,
            w.startTime
          ]
        })
      }
    }
  }
  if (setStmts.length > 0) await db.batch(setStmts)

  const workoutsCreated = chunk.length
  const exercisesMapped = chunk.reduce((sum, w) => sum + w.exercises.length, 0) - exercisesCreated
  const setsCreated = setStmts.length

  return c.json({
    success: true,
    workoutsCreated,
    exercisesCreated,
    exercisesMapped,
    setsCreated
  })
})

export { tools as toolRoutes }
