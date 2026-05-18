import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { getDb } from '../db.js'
import '../types.js'

function getJwtSecret(c: any): Uint8Array {
  const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production'
  return new TextEncoder().encode(secret)
}

const auth = new Hono()

// Register
auth.post('/register', async (c) => {
  try {
    const { username, email, password } = await c.req.json()

    if (!username || !email || !password) {
      return c.json({ error: 'All fields are required' }, 400)
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const db = getDb()
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ? OR email = ?',
      args: [username, email]
    })

    if (existingUser.rows.length > 0) {
      return c.json({ error: 'Username or email already exists' }, 409)
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await db.execute({
      sql: 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      args: [username, email, passwordHash]
    })

    const userId = result.lastInsertRowid

    const secret = getJwtSecret(c)
    const token = await new SignJWT({ userId: Number(userId), username })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secret)

    return c.json({
      token,
      user: { id: Number(userId), username, email }
    })
  } catch (error) {
    console.error('Register error:', error)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

// Login
auth.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json()

    if (!username || !password) {
      return c.json({ error: 'Username and password are required' }, 400)
    }

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
      args: [username, username]
    })

    if (result.rows.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const user = result.rows[0]
    const validPassword = await bcrypt.compare(password, user.password_hash as string)

    if (!validPassword) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }

    const secret = getJwtSecret(c)
    const token = await new SignJWT({ 
      userId: Number(user.id), 
      username: user.username 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .setIssuedAt()
      .sign(secret)

    return c.json({
      token,
      user: { 
        id: Number(user.id), 
        username: user.username, 
        email: user.email 
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'Login failed' }, 500)
  }
})

// Verify token
auth.get('/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = getJwtSecret(c)
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })

    return c.json({ 
      valid: true, 
      user: { 
        userId: payload.userId, 
        username: payload.username 
      } 
    })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// Me
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401)
    }

    const token = authHeader.split(' ')[1]
    const secret = getJwtSecret(c)
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 })

    const db = getDb()
    const result = await db.execute({
      sql: 'SELECT id, username, email, created_at FROM users WHERE id = ?',
      args: [payload.userId as number]
    })

    if (result.rows.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const user = result.rows[0]
    return c.json({
      id: Number(user.id),
      username: user.username,
      email: user.email,
      createdAt: user.created_at
    })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export { auth as authRoutes }
