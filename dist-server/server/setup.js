import { initDatabase } from './db.js';
import { seedExercises } from './seed/exercises.js';
async function main() {
    console.log('🔧 Running database initialization...');
    await initDatabase();
    await seedExercises();
    console.log('✅ Database setup complete');
    process.exit(0);
}
main().catch(console.error);
