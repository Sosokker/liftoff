import { Hono } from 'hono';
import { getDb } from '../db.js';
import { jwtVerify } from 'jose';
import '../types.js';
function getJwtSecret(c) {
    const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production';
    return new TextEncoder().encode(secret);
}
const workouts = new Hono();
workouts.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    try {
        const token = authHeader.split(' ')[1];
        const secret = getJwtSecret(c);
        const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
        c.set('userId', payload.userId);
        await next();
    }
    catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
});
// Get workout history
workouts.get('/', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const db = getDb();
    const result = await db.execute({
        sql: `
      SELECT w.*, 
        (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id) as exercise_count,
        (SELECT COUNT(*) FROM sets s 
         JOIN workout_exercises we ON s.workout_exercise_id = we.id 
         WHERE we.workout_id = w.id AND s.is_completed = 1) as completed_sets
      FROM workouts w 
      WHERE w.user_id = ? 
      ORDER BY w.start_time DESC
      LIMIT ? OFFSET ?
    `,
        args: [userId, limit, offset]
    });
    return c.json(result.rows);
});
// Get workout by ID with full details
workouts.get('/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const db = getDb();
    const workoutResult = await db.execute({
        sql: 'SELECT * FROM workouts WHERE id = ? AND user_id = ?',
        args: [id, userId]
    });
    if (workoutResult.rows.length === 0) {
        return c.json({ error: 'Workout not found' }, 404);
    }
    const exercisesResult = await db.execute({
        sql: `
      SELECT we.*, e.name as exercise_name, e.muscle_group, e.equipment
      FROM workout_exercises we
      JOIN exercises e ON we.exercise_id = e.id
      WHERE we.workout_id = ?
      ORDER BY we.order_index
    `,
        args: [id]
    });
    const exercises = [];
    for (const ex of exercisesResult.rows) {
        const setsResult = await db.execute({
            sql: 'SELECT * FROM sets WHERE workout_exercise_id = ? ORDER BY set_number',
            args: [ex.id]
        });
        exercises.push({
            ...ex,
            sets: setsResult.rows
        });
    }
    return c.json({
        ...workoutResult.rows[0],
        exercises
    });
});
// Create workout
workouts.post('/', async (c) => {
    try {
        const userId = c.get('userId');
        const body = await c.req.json();
        const name = body.name?.trim();
        const routine_id = body.routine_id || null;
        const notes = body.notes || null;
        const workoutExercises = body.exercises;
        // Validate required fields
        if (!name || name.length === 0) {
            return c.json({ error: 'Workout name is required' }, 400);
        }
        if (workoutExercises && !Array.isArray(workoutExercises)) {
            return c.json({ error: 'Exercises must be an array' }, 400);
        }
        const db = getDb();
        const workoutResult = await db.execute({
            sql: 'INSERT INTO workouts (user_id, routine_id, name, start_time, notes) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)',
            args: [userId, routine_id, name, notes]
        });
        const workoutId = Number(workoutResult.lastInsertRowid);
        if (workoutExercises && workoutExercises.length > 0) {
            for (let i = 0; i < workoutExercises.length; i++) {
                const ex = workoutExercises[i];
                // Validate exercise_id
                const exerciseId = ex.exercise_id || ex.exerciseId;
                if (!exerciseId) {
                    return c.json({ error: `Exercise at index ${i} is missing exercise_id` }, 400);
                }
                const exResult = await db.execute({
                    sql: 'INSERT INTO workout_exercises (workout_id, exercise_id, order_index, notes) VALUES (?, ?, ?, ?)',
                    args: [workoutId, exerciseId, i, ex.notes || null]
                });
                const workoutExerciseId = Number(exResult.lastInsertRowid);
                if (ex.sets && ex.sets.length > 0) {
                    for (let j = 0; j < ex.sets.length; j++) {
                        const set = ex.sets[j];
                        await db.execute({
                            sql: `
                INSERT INTO sets 
                (workout_exercise_id, set_type, set_number, reps, weight, rpe, is_completed, completed_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
                            args: [
                                workoutExerciseId,
                                set.set_type || 'normal',
                                j + 1,
                                set.reps || null,
                                set.weight || null,
                                set.rpe || null,
                                set.is_completed ? 1 : 0,
                                set.is_completed ? new Date().toISOString() : null
                            ]
                        });
                    }
                }
            }
        }
        return c.json({ id: workoutId }, 201);
    }
    catch (error) {
        console.error('Create workout error:', error);
        return c.json({ error: 'Failed to create workout' }, 500);
    }
});
// Update workout (finish, add sets, etc.)
workouts.put('/:id', async (c) => {
    try {
        const id = c.req.param('id');
        const userId = c.get('userId');
        const body = await c.req.json();
        const end_time = body.end_time;
        const duration_seconds = body.duration_seconds;
        const notes = body.notes;
        const workoutExercises = body.exercises;
        const db = getDb();
        if (end_time !== undefined || duration_seconds !== undefined || notes !== undefined) {
            await db.execute({
                sql: 'UPDATE workouts SET end_time = ?, duration_seconds = ?, notes = ? WHERE id = ? AND user_id = ?',
                args: [end_time || null, duration_seconds || null, notes || null, id, userId]
            });
        }
        if (workoutExercises) {
            for (const ex of workoutExercises) {
                if (ex.sets) {
                    for (const set of ex.sets) {
                        if (set.id) {
                            await db.execute({
                                sql: `
                  UPDATE sets 
                  SET set_type = ?, reps = ?, weight = ?, rpe = ?, is_completed = ?, completed_at = ?
                  WHERE id = ?
                `,
                                args: [
                                    set.set_type || 'normal',
                                    set.reps || null,
                                    set.weight || null,
                                    set.rpe || null,
                                    set.is_completed ? 1 : 0,
                                    set.is_completed ? new Date().toISOString() : null,
                                    set.id
                                ]
                            });
                        }
                        else {
                            await db.execute({
                                sql: `
                  INSERT INTO sets 
                  (workout_exercise_id, set_type, set_number, reps, weight, rpe, is_completed, completed_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                                args: [
                                    ex.id,
                                    set.set_type || 'normal',
                                    set.set_number,
                                    set.reps || null,
                                    set.weight || null,
                                    set.rpe || null,
                                    set.is_completed ? 1 : 0,
                                    set.is_completed ? new Date().toISOString() : null
                                ]
                            });
                        }
                    }
                }
            }
        }
        return c.json({ success: true });
    }
    catch (error) {
        console.error('Update workout error:', error);
        return c.json({ error: 'Failed to update workout' }, 500);
    }
});
// Delete workout
workouts.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const db = getDb();
    await db.execute({
        sql: 'DELETE FROM workouts WHERE id = ? AND user_id = ?',
        args: [id, userId]
    });
    return c.json({ success: true });
});
// Get previous performance for exercise
workouts.get('/history/exercise/:exerciseId', async (c) => {
    const exerciseId = c.req.param('exerciseId');
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '10');
    const db = getDb();
    const result = await db.execute({
        sql: `
      SELECT 
        w.start_time,
        s.reps,
        s.weight,
        s.rpe,
        s.set_type,
        s.set_number,
        s.is_completed
      FROM sets s
      JOIN workout_exercises we ON s.workout_exercise_id = we.id
      JOIN workouts w ON we.workout_id = w.id
      WHERE we.exercise_id = ? AND w.user_id = ? AND s.is_completed = 1
      ORDER BY w.start_time DESC, s.set_number
      LIMIT ?
    `,
        args: [exerciseId, userId, limit]
    });
    return c.json(result.rows);
});
export { workouts as workoutRoutes };
