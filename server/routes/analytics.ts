import { Hono } from 'hono'
import { getDb } from '../db.js'
import { jwtVerify } from 'jose'
import '../types.js'

function getJwtSecret(c: any): Uint8Array {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const analytics = new Hono()

analytics.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const token = authHeader.split(' ')[1]
    const secret = getJwtSecret(c)
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })
    c.set('userId', payload.userId as number)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Volume over time
analytics.get('/volume', async (c) => {
  const userId = c.get('userId')
  const period = c.req.query('period') || '30d'
  const db = getDb()
  
  let dateFilter = ''
  if (period === '7d') dateFilter = "AND w.start_time >= datetime('now', '-7 days')"
  else if (period === '30d') dateFilter = "AND w.start_time >= datetime('now', '-30 days')"
  else if (period === '90d') dateFilter = "AND w.start_time >= datetime('now', '-90 days')"
  else if (period === '1y') dateFilter = "AND w.start_time >= datetime('now', '-1 year')"

  const result = await db.execute({
    sql: `
      SELECT 
        date(w.start_time) as date,
        SUM(s.weight * s.reps) as volume,
        COUNT(DISTINCT w.id) as workout_count
      FROM workouts w
      JOIN workout_exercises we ON w.id = we.workout_id
      JOIN sets s ON we.id = s.workout_exercise_id
      WHERE w.user_id = ? AND s.is_completed = 1 ${dateFilter}
      GROUP BY date(w.start_time)
      ORDER BY date
    `,
    args: [userId]
  })

  return c.json(result.rows)
})

// Exercise-specific analytics
analytics.get('/exercise/:exerciseId', async (c) => {
  const exerciseId = c.req.param('exerciseId')
  const userId = c.get('userId')
  const period = c.req.query('period') || '30d'
  const db = getDb()
  
  let dateFilter = ''
  if (period === '7d') dateFilter = "AND w.start_time >= datetime('now', '-7 days')"
  else if (period === '30d') dateFilter = "AND w.start_time >= datetime('now', '-30 days')"
  else if (period === '90d') dateFilter = "AND w.start_time >= datetime('now', '-90 days')"
  else if (period === '1y') dateFilter = "AND w.start_time >= datetime('now', '-1 year')"

  const volumeResult = await db.execute({
    sql: `
      SELECT 
        date(w.start_time) as date,
        SUM(s.weight * s.reps) as volume,
        MAX(s.weight) as max_weight,
        SUM(s.reps) as total_reps
      FROM workouts w
      JOIN workout_exercises we ON w.id = we.workout_id
      JOIN sets s ON we.id = s.workout_exercise_id
      WHERE w.user_id = ? AND we.exercise_id = ? AND s.is_completed = 1 ${dateFilter}
      GROUP BY date(w.start_time)
      ORDER BY date
    `,
    args: [userId, exerciseId]
  })

  // Calculate estimated 1RM
  const rmResult = await db.execute({
    sql: `
      SELECT 
        date(w.start_time) as date,
        MAX(s.weight * (1 + s.reps / 30.0)) as estimated_1rm
      FROM workouts w
      JOIN workout_exercises we ON w.id = we.workout_id
      JOIN sets s ON we.id = s.workout_exercise_id
      WHERE w.user_id = ? AND we.exercise_id = ? AND s.is_completed = 1 ${dateFilter}
      GROUP BY date(w.start_time)
      ORDER BY date
    `,
    args: [userId, exerciseId]
  })

  return c.json({
    volume: volumeResult.rows,
    oneRepMax: rmResult.rows
  })
})

// Muscle group distribution
analytics.get('/muscles', async (c) => {
  const userId = c.get('userId')
  const period = c.req.query('period') || '30d'
  const db = getDb()
  
  let dateFilter = ''
  if (period === '7d') dateFilter = "AND w.start_time >= datetime('now', '-7 days')"
  else if (period === '30d') dateFilter = "AND w.start_time >= datetime('now', '-30 days')"
  else if (period === '90d') dateFilter = "AND w.start_time >= datetime('now', '-90 days')"
  else if (period === '1y') dateFilter = "AND w.start_time >= datetime('now', '-1 year')"

  const result = await db.execute({
    sql: `
      SELECT 
        e.muscle_group,
        COUNT(*) as set_count,
        SUM(s.weight * s.reps) as volume
      FROM workouts w
      JOIN workout_exercises we ON w.id = we.workout_id
      JOIN sets s ON we.id = s.workout_exercise_id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE w.user_id = ? AND s.is_completed = 1 ${dateFilter}
      GROUP BY e.muscle_group
      ORDER BY set_count DESC
    `,
    args: [userId]
  })

  return c.json(result.rows)
})

// Training calendar
analytics.get('/calendar', async (c) => {
  const userId = c.get('userId')
  const year = c.req.query('year') || new Date().getFullYear().toString()
  const month = c.req.query('month') || (new Date().getMonth() + 1).toString()
  const db = getDb()
  
  const result = await db.execute({
    sql: `
      SELECT 
        date(start_time) as date,
        COUNT(*) as workout_count,
        SUM(duration_seconds) as total_duration
      FROM workouts
      WHERE user_id = ? 
        AND strftime('%Y', start_time) = ? 
        AND strftime('%m', start_time) = ?
      GROUP BY date(start_time)
      ORDER BY date
    `,
    args: [userId, year, month.padStart(2, '0')]
  })

  return c.json(result.rows)
})

// Strength levels (big 3)
analytics.get('/strength-levels', async (c) => {
  const userId = c.get('userId')
  const db = getDb()
  
  const exercises = ['Bench Press', 'Squat', 'Deadlift']
  const levels = []

  for (const exerciseName of exercises) {
    const result = await db.execute({
      sql: `
        SELECT MAX(s.weight) as max_weight
        FROM sets s
        JOIN workout_exercises we ON s.workout_exercise_id = we.id
        JOIN workouts w ON we.workout_id = w.id
        JOIN exercises e ON we.exercise_id = e.id
        WHERE w.user_id = ? AND e.name = ? AND s.reps <= 5 AND s.is_completed = 1
      `,
      args: [userId, exerciseName]
    })

    levels.push({
      exercise: exerciseName,
      maxWeight: result.rows[0]?.max_weight || 0
    })
  }

  return c.json(levels)
})

// Workout streak
analytics.get('/streak', async (c) => {
  const userId = c.get('userId')
  const db = getDb()
  
  const result = await db.execute({
    sql: `
      SELECT DISTINCT date(start_time) as workout_date
      FROM workouts
      WHERE user_id = ?
      ORDER BY workout_date DESC
    `,
    args: [userId]
  })

  const dates = result.rows.map(r => r.workout_date as string)
  
  let currentStreak = 0
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  
  if (dates.length > 0) {
    const mostRecent = dates[0]
    if (mostRecent === today || mostRecent === yesterday) {
      currentStreak = 1
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1])
        const currDate = new Date(dates[i])
        const diffDays = (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  return c.json({ currentStreak, totalWorkouts: dates.length })
})

// All workout dates for contribution grid
analytics.get('/workout-dates', async (c) => {
  const userId = c.get('userId')
  const months = parseInt(c.req.query('months') || '6')
  const db = getDb()

  const result = await db.execute({
    sql: `
      SELECT DISTINCT date(start_time) as workout_date
      FROM workouts
      WHERE user_id = ?
        AND start_time >= datetime('now', '-${months} months')
      ORDER BY workout_date ASC
    `,
    args: [userId]
  })

  return c.json(result.rows.map(r => r.workout_date))
})

export { analytics as analyticsRoutes }
