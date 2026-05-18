import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { serve } from '@hono/node-server'
import { authRoutes } from './routes/auth.js'
import { exerciseRoutes } from './routes/exercises.js'
import { routineRoutes } from './routes/routines.js'
import { workoutRoutes } from './routes/workouts.js'
import { analyticsRoutes } from './routes/analytics.js'
import { bodyRoutes } from './routes/body.js'
import { toolRoutes } from './routes/tools.js'
import { initDatabase } from './db.js'
import { seedExercises } from './seed/exercises.js'

// Initialize database on startup
await initDatabase()
await seedExercises()

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use(logger())

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'liftoff-api' }))

// API routes
app.route('/api/auth', authRoutes)
app.route('/api/exercises', exerciseRoutes)
app.route('/api/routines', routineRoutes)
app.route('/api/workouts', workoutRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/body', bodyRoutes)
app.route('/api/tools', toolRoutes)

const port = parseInt(process.env.PORT || '3000')

console.log(`🚀 Server running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
