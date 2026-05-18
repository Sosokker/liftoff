import { Hono } from 'hono';
import { getDb } from '../db.js';
import { jwtVerify } from 'jose';
import '../types.js';
function getJwtSecret(c) {
    const secret = c.env?.JWT_SECRET || (typeof process !== 'undefined' ? process.env?.JWT_SECRET : undefined) || 'liftoff-super-secret-key-change-in-production';
    return new TextEncoder().encode(secret);
}
const body = new Hono();
body.use('*', async (c, next) => {
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
// Get measurements
body.get('/measurements', async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit') || '100');
    const db = getDb();
    const result = await db.execute({
        sql: `
      SELECT * FROM body_measurements 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT ?
    `,
        args: [userId, limit]
    });
    return c.json(result.rows);
});
// Add measurement
body.post('/measurements', async (c) => {
    try {
        const userId = c.get('userId');
        const body = await c.req.json();
        const date = body.date;
        const weight = body.weight ?? body.weight;
        const body_fat = body.body_fat ?? body.bodyFat;
        const neck = body.neck ?? null;
        const chest = body.chest ?? null;
        const waist = body.waist ?? null;
        const hips = body.hips ?? null;
        const biceps = body.biceps ?? null;
        const forearms = body.forearms ?? null;
        const thighs = body.thighs ?? null;
        const calves = body.calves ?? null;
        if (!date) {
            return c.json({ error: 'Date is required' }, 400);
        }
        // Validate numeric fields
        if (weight !== undefined && weight !== null && (isNaN(weight) || Number(weight) < 0)) {
            return c.json({ error: 'Weight must be a positive number' }, 400);
        }
        if (body_fat !== undefined && body_fat !== null && (isNaN(body_fat) || Number(body_fat) < 0 || Number(body_fat) > 100)) {
            return c.json({ error: 'Body fat must be between 0 and 100' }, 400);
        }
        const db = getDb();
        const result = await db.execute({
            sql: `
        INSERT INTO body_measurements 
        (user_id, date, weight, body_fat, neck, chest, waist, hips, biceps, forearms, thighs, calves)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            args: [userId, date, weight || null, body_fat || null, neck, chest,
                waist, hips, biceps, forearms, thighs, calves]
        });
        return c.json({ id: Number(result.lastInsertRowid) }, 201);
    }
    catch (error) {
        console.error('Add measurement error:', error);
        return c.json({ error: 'Failed to add measurement' }, 500);
    }
});
// Update measurement
body.put('/measurements/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const { date, weight, body_fat, neck, chest, waist, hips, biceps, forearms, thighs, calves } = await c.req.json();
    const db = getDb();
    await db.execute({
        sql: `
      UPDATE body_measurements 
      SET date = ?, weight = ?, body_fat = ?, neck = ?, chest = ?, waist = ?, 
          hips = ?, biceps = ?, forearms = ?, thighs = ?, calves = ?
      WHERE id = ? AND user_id = ?
    `,
        args: [date, weight || null, body_fat || null, neck || null, chest || null,
            waist || null, hips || null, biceps || null, forearms || null, thighs || null, calves || null,
            id, userId]
    });
    return c.json({ success: true });
});
// Delete measurement
body.delete('/measurements/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const db = getDb();
    await db.execute({
        sql: 'DELETE FROM body_measurements WHERE id = ? AND user_id = ?',
        args: [id, userId]
    });
    return c.json({ success: true });
});
// Weight averaging
body.get('/weight-average', async (c) => {
    const userId = c.get('userId');
    const db = getDb();
    const result = await db.execute({
        sql: `
      SELECT 
        strftime('%Y-%W', date) as week,
        AVG(weight) as avg_weight,
        COUNT(*) as entry_count,
        MIN(weight) as min_weight,
        MAX(weight) as max_weight
      FROM body_measurements
      WHERE user_id = ? AND weight IS NOT NULL
      GROUP BY strftime('%Y-%W', date)
      ORDER BY week DESC
      LIMIT 12
    `,
        args: [userId]
    });
    return c.json(result.rows);
});
// Progress photos
body.get('/photos', async (c) => {
    const userId = c.get('userId');
    const db = getDb();
    const result = await db.execute({
        sql: 'SELECT id, date, caption, created_at FROM progress_photos WHERE user_id = ? ORDER BY date DESC',
        args: [userId]
    });
    return c.json(result.rows);
});
body.post('/photos', async (c) => {
    const userId = c.get('userId');
    const { date, photo_data, caption } = await c.req.json();
    if (!date || !photo_data) {
        return c.json({ error: 'Date and photo data are required' }, 400);
    }
    const db = getDb();
    const result = await db.execute({
        sql: 'INSERT INTO progress_photos (user_id, date, photo_data, caption) VALUES (?, ?, ?, ?)',
        args: [userId, date, photo_data, caption || null]
    });
    return c.json({ id: Number(result.lastInsertRowid) }, 201);
});
body.delete('/photos/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId');
    const db = getDb();
    await db.execute({
        sql: 'DELETE FROM progress_photos WHERE id = ? AND user_id = ?',
        args: [id, userId]
    });
    return c.json({ success: true });
});
export { body as bodyRoutes };
