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

// Import workouts from Hevy CSV export
// POST body: { csvText: string }
tools.post('/import-hevy', async (c) => {
  const authHeader = c.req.header('Authorization')
  const token = authHeader!.split(' ')[1]
  const secret = getJwtSecret(c)
  const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })
  const userId = payload.userId as number

  const { csvText } = await c.req.json()
  if (!csvText || typeof csvText !== 'string') {
    return c.json({ error: 'csvText is required' }, 400)
  }

  const lines = csvText.split('\n').filter(l => l.trim())
  if (lines.length < 2) {
    return c.json({ error: 'CSV is empty or missing header' }, 400)
  }

  // Parse header to get column indices
  const headers = parseCSVLine(lines[0])
  const colIndex: Record<string, number> = {}
  headers.forEach((h, i) => { colIndex[h] = i })

  const requiredCols = ['title', 'start_time', 'exercise_title', 'set_index', 'set_type']
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      return c.json({ error: `Missing required column: ${col}` }, 400)
    }
  }

  const db = getDb()

  // Load existing exercises for mapping
  const existingExercises = await db.execute({
    sql: 'SELECT id, name, muscle_group, equipment FROM exercises',
    args: []
  })
  const exerciseMap = new Map<string, { id: number; name: string; muscle_group: string; equipment: string }>()
  for (const row of existingExercises.rows) {
    const name = String(row.name).toLowerCase()
    exerciseMap.set(name, {
      id: Number(row.id),
      name: String(row.name),
      muscle_group: String(row.muscle_group),
      equipment: String(row.equipment || '')
    })
    // Also map normalized version (without equipment suffix)
    const normalized = normalizeExerciseName(name).toLowerCase()
    if (normalized !== name) {
      exerciseMap.set(normalized, {
        id: Number(row.id),
        name: String(row.name),
        muscle_group: String(row.muscle_group),
        equipment: String(row.equipment || '')
      })
    }
  }

  // Also build a map by normalized name for fuzzy matching
  const normalizedExerciseMap = new Map<string, { id: number; name: string; muscle_group: string; equipment: string }>()
  for (const row of existingExercises.rows) {
    const normalized = normalizeExerciseName(String(row.name)).toLowerCase()
    normalizedExerciseMap.set(normalized, {
      id: Number(row.id),
      name: String(row.name),
      muscle_group: String(row.muscle_group),
      equipment: String(row.equipment || '')
    })
  }

  // Group rows by workout key (title + start_time)
  interface HevySet {
    exerciseTitle: string
    supersetId: string
    exerciseNotes: string
    setIndex: number
    setType: string
    weightKg: number | null
    reps: number | null
    distanceKm: number | null
    durationSeconds: number | null
    rpe: number | null
  }
  interface HevyWorkout {
    title: string
    startTime: Date
    endTime: Date | null
    description: string
    exercises: Map<string, HevySet[]> // key = exerciseTitle, value = sets
  }

  const workoutsMap = new Map<string, HevyWorkout>()

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    if (fields.length < headers.length) continue

    const title = fields[colIndex['title']] || 'Workout'
    const startTimeStr = fields[colIndex['start_time']]
    const startTime = parseHevyDate(startTimeStr)
    if (!startTime) continue

    const workoutKey = `${title}|${startTimeStr}`
    if (!workoutsMap.has(workoutKey)) {
      const endTime = parseHevyDate(fields[colIndex['end_time']])
      workoutsMap.set(workoutKey, {
        title,
        startTime,
        endTime,
        description: fields[colIndex['description']] || '',
        exercises: new Map()
      })
    }

    const workout = workoutsMap.get(workoutKey)!
    const exerciseTitle = fields[colIndex['exercise_title']]
    if (!exerciseTitle) continue

    if (!workout.exercises.has(exerciseTitle)) {
      workout.exercises.set(exerciseTitle, [])
    }

    const weightKg = fields[colIndex['weight_kg']]
    const reps = fields[colIndex['reps']]
    const distanceKm = fields[colIndex['distance_km']]
    const durationSeconds = fields[colIndex['duration_seconds']]
    const rpe = fields[colIndex['rpe']]

    workout.exercises.get(exerciseTitle)!.push({
      exerciseTitle,
      supersetId: fields[colIndex['superset_id']] || '',
      exerciseNotes: fields[colIndex['exercise_notes']] || '',
      setIndex: parseInt(fields[colIndex['set_index']] || '0', 10) || 0,
      setType: fields[colIndex['set_type']] || 'normal',
      weightKg: weightKg ? parseFloat(weightKg) : null,
      reps: reps ? parseInt(reps, 10) : null,
      distanceKm: distanceKm ? parseFloat(distanceKm) : null,
      durationSeconds: durationSeconds ? parseInt(durationSeconds, 10) : null,
      rpe: rpe ? parseFloat(rpe) : null
    })
  }

  let workoutsCreated = 0
  let exercisesCreated = 0
  let setsCreated = 0
  let exercisesMapped = 0
  const errors: string[] = []

  for (const [, workoutData] of workoutsMap) {
    try {
      // Calculate duration
      let durationSeconds: number | null = null
      if (workoutData.endTime) {
        durationSeconds = Math.floor((workoutData.endTime.getTime() - workoutData.startTime.getTime()) / 1000)
      }

      // Insert workout
      const workoutResult = await db.execute({
        sql: 'INSERT INTO workouts (user_id, name, start_time, end_time, duration_seconds, notes) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          userId,
          workoutData.title,
          workoutData.startTime.toISOString(),
          workoutData.endTime ? workoutData.endTime.toISOString() : null,
          durationSeconds,
          workoutData.description || null
        ]
      })
      const workoutId = Number(workoutResult.lastInsertRowid)
      workoutsCreated++

      let exerciseOrderIndex = 0
      for (const [exerciseTitle, sets] of workoutData.exercises) {
        // Try to find or create exercise
        let exerciseId: number
        const normalizedHevyName = normalizeExerciseName(exerciseTitle).toLowerCase()
        const exactMatch = exerciseMap.get(exerciseTitle.toLowerCase())
        const normalizedMatch = normalizedExerciseMap.get(normalizedHevyName)

        if (exactMatch) {
          exerciseId = exactMatch.id
          exercisesMapped++
        } else if (normalizedMatch) {
          exerciseId = normalizedMatch.id
          exercisesMapped++
        } else {
          // Try fuzzy matching: check if any existing exercise normalized name contains the hevy name or vice versa
          let fuzzyMatch: { id: number } | null = null
          for (const [existingName, existing] of normalizedExerciseMap) {
            if (existingName.includes(normalizedHevyName) || normalizedHevyName.includes(existingName)) {
              fuzzyMatch = existing
              break
            }
          }

          if (fuzzyMatch) {
            exerciseId = fuzzyMatch.id
            exercisesMapped++
          } else {
            // Create custom exercise
            const muscleGroup = guessMuscleGroup(exerciseTitle)
            const equipment = extractEquipment(exerciseTitle)
            const exResult = await db.execute({
              sql: 'INSERT INTO exercises (user_id, name, muscle_group, equipment, instructions, is_custom) VALUES (?, ?, ?, ?, ?, 1)',
              args: [userId, exerciseTitle, muscleGroup, equipment, null]
            })
            exerciseId = Number(exResult.lastInsertRowid)
            exercisesCreated++

            // Add to maps for subsequent lookups
            exerciseMap.set(exerciseTitle.toLowerCase(), {
              id: exerciseId,
              name: exerciseTitle,
              muscle_group: muscleGroup,
              equipment
            })
            normalizedExerciseMap.set(normalizedHevyName, {
              id: exerciseId,
              name: exerciseTitle,
              muscle_group: muscleGroup,
              equipment
            })
          }
        }

        // Insert workout_exercise
        const workoutExerciseNotes = sets.find(s => s.exerciseNotes)?.exerciseNotes || ''
        const weResult = await db.execute({
          sql: 'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes) VALUES (?, ?, ?, ?)',
          args: [workoutId, exerciseId, exerciseOrderIndex, workoutExerciseNotes || null]
        })
        const workoutExerciseId = Number(weResult.lastInsertRowid)
        exerciseOrderIndex++

        // Sort sets by set_index
        sets.sort((a, b) => a.setIndex - b.setIndex)

        // Insert sets
        for (let setIdx = 0; setIdx < sets.length; setIdx++) {
          const set = sets[setIdx]
          await db.execute({
            sql: `
              INSERT INTO sets 
              (workout_exercise_id, set_type, set_number, reps, weight, rpe, is_completed, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              workoutExerciseId,
              mapSetType(set.setType),
              setIdx + 1,
              set.reps,
              set.weightKg,
              set.rpe,
              1, // All imported sets are completed
              workoutData.startTime.toISOString()
            ]
          })
          setsCreated++
        }
      }
    } catch (err: any) {
      errors.push(`Failed to import workout "${workoutData.title}": ${err.message}`)
    }
  }

  return c.json({
    success: true,
    workoutsCreated,
    exercisesCreated,
    exercisesMapped,
    setsCreated,
    totalRowsParsed: lines.length - 1,
    errors: errors.length > 0 ? errors : undefined
  })
})

export { tools as toolRoutes }
