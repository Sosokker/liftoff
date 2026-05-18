import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authRoutes } from './routes/auth.js'
import { exerciseRoutes } from './routes/exercises.js'
import { routineRoutes } from './routes/routines.js'
import { workoutRoutes } from './routes/workouts.js'
import { analyticsRoutes } from './routes/analytics.js'
import { bodyRoutes } from './routes/body.js'
import { toolRoutes } from './routes/tools.js'
import { oauthRoutes } from './routes/oauth.js'
import { getDb, initDatabase, resetDb } from './db.js'
import { seedExercises } from './seed/exercises.js'

export interface Env {
  TURSO_URL: string
  TURSO_TOKEN: string
  JWT_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// Initialize db with env on each request
app.use('*', async (c, next) => {
  // Reset and reinitialize db with current env
  resetDb()
  getDb(c.env.TURSO_URL, c.env.TURSO_TOKEN)
  await next()
})

app.use('*', cors({
  origin: (origin) => {
    // Allow specific origins or any origin for API access
    const allowedOrigins = [
      'https://liftoff.sirin.dev',
      'https://07621f2c.liftoff-drw.pages.dev',
      'https://liftoff-drw.pages.dev',
      'http://localhost:5173',
      'http://localhost:3000'
    ]
    if (allowedOrigins.includes(origin) || !origin) {
      return origin
    }
    return ''
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'liftoff-api', platform: 'cloudflare-workers' }))

// Initialize database on first request
let dbInitialized = false
app.use('*', async (c, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase()
      await seedExercises()
      dbInitialized = true
    } catch (error) {
      console.error('DB init error:', error)
    }
  }
  await next()
})

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/auth/google', oauthRoutes)
app.route('/api/exercises', exerciseRoutes)
app.route('/api/routines', routineRoutes)
app.route('/api/workouts', workoutRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/body', bodyRoutes)
app.route('/api/tools', toolRoutes)

export default app
