import { Hono } from 'hono'
import { getDb } from '../db.js'
import { jwtVerify } from 'jose'
import '../types.js'

function getJwtSecret(c: any): Uint8Array {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const exercises = new Hono()

// Auth middleware
exercises.use('*', async (c, next) => {
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

// Get all exercises (preset + user's custom)
exercises.get('/', async (c) => {
  const userId = c.get('userId')
  const db = getDb()
  
  const result = await db.execute({
    sql: `
      SELECT id, name, muscle_group, equipment, instructions, is_custom, user_id 
      FROM exercises 
      WHERE user_id IS NULL OR user_id = ?
      ORDER BY name
    `,
    args: [userId]
  })

  return c.json(result.rows)
})

// Get exercise by ID
exercises.get('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const db = getDb()
  
  const result = await db.execute({
    sql: `
      SELECT * FROM exercises 
      WHERE id = ? AND (user_id IS NULL OR user_id = ?)
    `,
    args: [id, userId]
  })

  if (result.rows.length === 0) {
    return c.json({ error: 'Exercise not found' }, 404)
  }

  return c.json(result.rows[0])
})

// Create custom exercise
exercises.post('/', async (c) => {
  const userId = c.get('userId')
  const { name, muscle_group, equipment, instructions } = await c.req.json()

  if (!name || !muscle_group) {
    return c.json({ error: 'Name and muscle group are required' }, 400)
  }

  const db = getDb()
  const result = await db.execute({
    sql: `
      INSERT INTO exercises (user_id, name, muscle_group, equipment, instructions, is_custom) 
      VALUES (?, ?, ?, ?, ?, 1)
    `,
    args: [userId, name, muscle_group, equipment || null, instructions || null]
  })

  return c.json({ id: Number(result.lastInsertRowid) }, 201)
})

// Update exercise
exercises.put('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  const { name, muscle_group, equipment, instructions } = await c.req.json()

  const db = getDb()
  await db.execute({
    sql: `
      UPDATE exercises 
      SET name = ?, muscle_group = ?, equipment = ?, instructions = ?
      WHERE id = ? AND user_id = ?
    `,
    args: [name, muscle_group, equipment, instructions, id, userId]
  })

  return c.json({ success: true })
})

// Delete custom exercise
exercises.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')

  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM exercises WHERE id = ? AND user_id = ?',
    args: [id, userId]
  })

  return c.json({ success: true })
})

export { exercises as exerciseRoutes }
