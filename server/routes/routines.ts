import { Hono } from 'hono'
import { getDb } from '../db.js'
import { jwtVerify } from 'jose'
import '../types.js'

function getJwtSecret(c: any): Uint8Array {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const routines = new Hono()

routines.use('*', async (c, next) => {
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

// Get all routines
routines.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()
  
  const result = await db.execute({
    sql: `
      SELECT r.*, 
        (SELECT COUNT(*) FROM routine_exercises WHERE routine_id = r.id) as exercise_count
      FROM routines r 
      WHERE r.user_id = ? 
      ORDER BY r.updated_at DESC
    `,
    args: [userId]
  })

  return c.json(result.rows)
})

// Get routine with exercises
routines.get('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const db = getDb()
  
  const routineResult = await db.execute({
    sql: 'SELECT * FROM routines WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })

  if (routineResult.rows.length === 0) {
    return c.json({ error: 'Routine not found' }, 404)
  }

  const exercisesResult = await db.execute({
    sql: `
      SELECT re.*, e.name as exercise_name, e.muscle_group, e.equipment
      FROM routine_exercises re
      JOIN exercises e ON re.exercise_id = e.id
      WHERE re.routine_id = ?
      ORDER BY re.order_index
    `,
    args: [id]
  })

  return c.json({
    ...routineResult.rows[0],
    exercises: exercisesResult.rows
  })
})

// Create routine
routines.post('/', async (c) => {
  const userId = c.get('userId')
  const { name, description, exercises: routineExercises } = await c.req.json()

  if (!name) {
    return c.json({ error: 'Name is required' }, 400)
  }

  const db = getDb()
  const routineResult = await db.execute({
    sql: 'INSERT INTO routines (user_id, name, description) VALUES (?, ?, ?)',
    args: [userId, name, description || null]
  })

  const routineId = Number(routineResult.lastInsertRowid)

  if (routineExercises && routineExercises.length > 0) {
    for (let i = 0; i < routineExercises.length; i++) {
      const ex = routineExercises[i]
      await db.execute({
        sql: `
          INSERT INTO routine_exercises 
          (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds) 
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [routineId, ex.exercise_id, i, ex.target_sets || 3, ex.target_reps || 10, ex.rest_seconds || 60]
      })
    }
  }

  return c.json({ id: routineId }, 201)
})

// Update routine
routines.put('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const { name, description, exercises: routineExercises } = await c.req.json()

  const db = getDb()
  await db.execute({
    sql: 'UPDATE routines SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    args: [name, description, id, userId]
  })

  if (routineExercises) {
    await db.execute({
      sql: 'DELETE FROM routine_exercises WHERE routine_id = ?',
      args: [id]
    })

    for (let i = 0; i < routineExercises.length; i++) {
      const ex = routineExercises[i]
      await db.execute({
        sql: `
          INSERT INTO routine_exercises 
          (routine_id, exercise_id, order_index, target_sets, target_reps, rest_seconds) 
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [id, ex.exercise_id, i, ex.target_sets || 3, ex.target_reps || 10, ex.rest_seconds || 60]
      })
    }
  }

  return c.json({ success: true })
})

// Delete routine
routines.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM routines WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })

  return c.json({ success: true })
})

export { routines as routineRoutes }
