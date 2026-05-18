import { getDb } from '../db.js'

const presetExercises = [
  // Chest
  { name: 'Bench Press', muscle_group: 'Chest', equipment: 'Barbell', instructions: 'Lie on bench, press barbell up from chest' },
  { name: 'Incline Bench Press', muscle_group: 'Chest', equipment: 'Barbell', instructions: 'Lie on incline bench, press barbell up' },
  { name: 'Dumbbell Flyes', muscle_group: 'Chest', equipment: 'Dumbbell', instructions: 'Lie on bench, open arms wide and squeeze chest' },
  { name: 'Cable Crossover', muscle_group: 'Chest', equipment: 'Cable', instructions: 'Pull cables together in front of body' },
  { name: 'Push-ups', muscle_group: 'Chest', equipment: 'Bodyweight', instructions: 'Lower body to ground and push back up' },
  { name: 'Dips', muscle_group: 'Chest', equipment: 'Bodyweight', instructions: 'Lower body on parallel bars, push up' },
  
  // Back
  { name: 'Deadlift', muscle_group: 'Back', equipment: 'Barbell', instructions: 'Lift barbell from ground to hip level' },
  { name: 'Pull-ups', muscle_group: 'Back', equipment: 'Bodyweight', instructions: 'Pull body up until chin is over bar' },
  { name: 'Bent Over Row', muscle_group: 'Back', equipment: 'Barbell', instructions: 'Bend over and row barbell to stomach' },
  { name: 'Lat Pulldown', muscle_group: 'Back', equipment: 'Cable', instructions: 'Pull bar down to upper chest' },
  { name: 'Seated Cable Row', muscle_group: 'Back', equipment: 'Cable', instructions: 'Pull handle towards torso while seated' },
  { name: 'T-Bar Row', muscle_group: 'Back', equipment: 'Machine', instructions: 'Row T-bar towards chest' },
  { name: 'Face Pull', muscle_group: 'Back', equipment: 'Cable', instructions: 'Pull rope towards face, elbows high' },
  
  // Shoulders
  { name: 'Overhead Press', muscle_group: 'Shoulders', equipment: 'Barbell', instructions: 'Press barbell overhead from shoulder height' },
  { name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders', equipment: 'Dumbbell', instructions: 'Press dumbbells overhead from shoulder height' },
  { name: 'Lateral Raises', muscle_group: 'Shoulders', equipment: 'Dumbbell', instructions: 'Raise dumbbells out to sides until shoulder height' },
  { name: 'Front Raises', muscle_group: 'Shoulders', equipment: 'Dumbbell', instructions: 'Raise dumbbells forward to shoulder height' },
  { name: 'Reverse Flyes', muscle_group: 'Shoulders', equipment: 'Dumbbell', instructions: 'Bend over and raise dumbbells out to sides' },
  { name: 'Arnold Press', muscle_group: 'Shoulders', equipment: 'Dumbbell', instructions: 'Rotate dumbbells while pressing overhead' },
  
  // Legs
  { name: 'Squat', muscle_group: 'Legs', equipment: 'Barbell', instructions: 'Lower hips back and down, then stand up' },
  { name: 'Leg Press', muscle_group: 'Legs', equipment: 'Machine', instructions: 'Push weight away using legs on machine' },
  { name: 'Leg Extension', muscle_group: 'Legs', equipment: 'Machine', instructions: 'Extend legs against resistance' },
  { name: 'Leg Curl', muscle_group: 'Legs', equipment: 'Machine', instructions: 'Curl legs back towards glutes' },
  { name: 'Romanian Deadlift', muscle_group: 'Legs', equipment: 'Barbell', instructions: 'Hinge at hips while keeping legs straight' },
  { name: 'Lunges', muscle_group: 'Legs', equipment: 'Bodyweight', instructions: 'Step forward and lower back knee to ground' },
  { name: 'Bulgarian Split Squat', muscle_group: 'Legs', equipment: 'Dumbbell', instructions: 'Single leg squat with rear foot elevated' },
  { name: 'Calf Raises', muscle_group: 'Legs', equipment: 'Machine', instructions: 'Raise heels up as high as possible' },
  { name: 'Hack Squat', muscle_group: 'Legs', equipment: 'Machine', instructions: 'Squat on machine with back supported' },
  { name: 'Goblet Squat', muscle_group: 'Legs', equipment: 'Dumbbell', instructions: 'Hold dumbbell at chest and squat' },
  
  // Arms - Biceps
  { name: 'Barbell Curl', muscle_group: 'Biceps', equipment: 'Barbell', instructions: 'Curl barbell up towards shoulders' },
  { name: 'Dumbbell Curl', muscle_group: 'Biceps', equipment: 'Dumbbell', instructions: 'Curl dumbbells up towards shoulders' },
  { name: 'Hammer Curl', muscle_group: 'Biceps', equipment: 'Dumbbell', instructions: 'Curl dumbbells with palms facing each other' },
  { name: 'Preacher Curl', muscle_group: 'Biceps', equipment: 'Barbell', instructions: 'Curl on preacher bench' },
  { name: 'Concentration Curl', muscle_group: 'Biceps', equipment: 'Dumbbell', instructions: 'Curl dumbbell with elbow braced against inner thigh' },
  { name: 'Cable Curl', muscle_group: 'Biceps', equipment: 'Cable', instructions: 'Curl cable attachment towards shoulders' },
  
  // Arms - Triceps
  { name: 'Tricep Pushdown', muscle_group: 'Triceps', equipment: 'Cable', instructions: 'Push cable down until arms are fully extended' },
  { name: 'Overhead Tricep Extension', muscle_group: 'Triceps', equipment: 'Dumbbell', instructions: 'Lower dumbbell behind head and extend arms' },
  { name: 'Close Grip Bench Press', muscle_group: 'Triceps', equipment: 'Barbell', instructions: 'Bench press with narrow grip' },
  { name: 'Skull Crushers', muscle_group: 'Triceps', equipment: 'Barbell', instructions: 'Lower barbell to forehead and extend arms' },
  { name: 'Dips', muscle_group: 'Triceps', equipment: 'Bodyweight', instructions: 'Lower body on parallel bars, keep torso upright' },
  { name: 'Diamond Push-ups', muscle_group: 'Triceps', equipment: 'Bodyweight', instructions: 'Push-ups with hands close together in diamond shape' },
  
  // Core
  { name: 'Plank', muscle_group: 'Core', equipment: 'Bodyweight', instructions: 'Hold push-up position on forearms' },
  { name: 'Crunches', muscle_group: 'Core', equipment: 'Bodyweight', instructions: 'Curl shoulders up towards hips' },
  { name: 'Leg Raises', muscle_group: 'Core', equipment: 'Bodyweight', instructions: 'Raise legs up while lying down' },
  { name: 'Russian Twists', muscle_group: 'Core', equipment: 'Bodyweight', instructions: 'Rotate torso side to side with feet elevated' },
  { name: 'Hanging Knee Raise', muscle_group: 'Core', equipment: 'Bodyweight', instructions: 'Hang from bar and raise knees to chest' },
  { name: 'Ab Wheel Rollout', muscle_group: 'Core', equipment: 'Wheel', instructions: 'Roll wheel forward from knees, maintaining straight body' },
  { name: 'Woodchoppers', muscle_group: 'Core', equipment: 'Cable', instructions: 'Pull cable diagonally across body' },
  
  // Glutes
  { name: 'Hip Thrust', muscle_group: 'Glutes', equipment: 'Barbell', instructions: 'Thrust hips up with barbell across hips' },
  { name: 'Glute Bridge', muscle_group: 'Glutes', equipment: 'Bodyweight', instructions: 'Lift hips up while lying on back' },
  { name: 'Cable Kickback', muscle_group: 'Glutes', equipment: 'Cable', instructions: 'Kick leg back against cable resistance' },
  { name: 'Step-ups', muscle_group: 'Glutes', equipment: 'Bodyweight', instructions: 'Step up onto elevated platform' },
  { name: 'Kettlebell Swing', muscle_group: 'Glutes', equipment: 'Kettlebell', instructions: 'Swing kettlebell up using hip hinge' },
]

export async function seedExercises() {
  console.log('🌱 Seeding preset exercises...')
  
  // Check if exercises already exist
  const db = getDb()
  const existing = await db.execute('SELECT COUNT(*) as count FROM exercises WHERE is_custom = 0')
  const count = (existing.rows[0] as any).count
  
  if (count > 0) {
    console.log(`✅ ${count} preset exercises already exist, skipping seed`)
    return
  }

  for (const exercise of presetExercises) {
    await db.execute({
      sql: 'INSERT INTO exercises (name, muscle_group, equipment, instructions, is_custom) VALUES (?, ?, ?, ?, 0)',
      args: [exercise.name, exercise.muscle_group, exercise.equipment, exercise.instructions]
    })
  }

  console.log(`✅ Seeded ${presetExercises.length} preset exercises`)
}
