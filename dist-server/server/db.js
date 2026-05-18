import { createClient } from '@libsql/client/web';
let dbInstance = null;
export function getDb(url, authToken) {
    if (dbInstance)
        return dbInstance;
    const dbUrl = url || (typeof process !== 'undefined' ? process.env?.TURSO_URL : undefined) || 'libsql://liftoff-sosokker.aws-ap-northeast-1.turso.io';
    const dbToken = authToken || (typeof process !== 'undefined' ? process.env?.TURSO_TOKEN : undefined) || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzg4MjEzMTcsImlkIjoiMDE5ZTJhMDEtYzcwMS03NjcwLWE3ODAtMGRhNWQ2YjE4ODY0IiwicmlkIjoiYmQ1ZWQ4ZmEtZTdlNC00NTQ4LThmMTgtM2IyODczOWIyOTRmIn0.AhP8Du8gU60zR8zidUrOmGGjryeTM6cnX9PRv02GqyNc_7hoWsx7hghsC83DGc9y_x5FSXoU7BwfCkvzZ4xXCA';
    dbInstance = createClient({
        url: dbUrl,
        authToken: dbToken,
    });
    return dbInstance;
}
export function resetDb() {
    dbInstance = null;
}
export const db = getDb();
export async function initDatabase() {
    const db = getDb();
    console.log('🗄️ Initializing database...');
    // Users table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Exercises table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      equipment TEXT,
      instructions TEXT,
      is_custom INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
    // Routines table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS routines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
    // Routine exercises table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      routine_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      target_sets INTEGER DEFAULT 3,
      target_reps INTEGER DEFAULT 10,
      rest_seconds INTEGER DEFAULT 60,
      FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )
  `);
    // Workouts table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      routine_id INTEGER,
      name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration_seconds INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (routine_id) REFERENCES routines(id)
    )
  `);
    // Workout exercises table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    )
  `);
    // Sets table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_exercise_id INTEGER NOT NULL,
      set_type TEXT DEFAULT 'normal',
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      rpe INTEGER,
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
    )
  `);
    // Body measurements table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS body_measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      weight REAL,
      body_fat REAL,
      neck REAL,
      chest REAL,
      waist REAL,
      hips REAL,
      biceps REAL,
      forearms REAL,
      thighs REAL,
      calves REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
    // Progress photos table
    await db.execute(`
    CREATE TABLE IF NOT EXISTS progress_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL,
      photo_data TEXT,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
    console.log('✅ Database initialized');
}
