# Liftoff - Hevy Clone Project Plan

## Overview
Production-ready PWA workout tracking app built with SolidJS + TypeScript, Turso database, and offline-first architecture.

## Tech Stack
- **Frontend**: SolidJS 1.9, TypeScript, Vite
- **Routing**: @solidjs/router
- **Styling**: Tailwind CSS + custom UberEats-inspired design tokens
- **State**: SolidJS signals + stores, with offline-first IndexedDB
- **Database**: Turso (libSQL) via @libsql/client
- **Auth**: JWT (jose library), username/password with OAuth extensibility
- **Charts**: Chart.js or lightweight SVG charts
- **PWA**: Vite PWA plugin, service worker, IndexedDB caching
- **Icons**: Lucide Solid

## Architecture

### Offline-First Strategy
1. All reads/writes go to IndexedDB first (local)
2. Background sync pushes changes to Turso when online
3. Conflict resolution: last-write-wins with timestamps
4. Turso acts as source-of-truth and sync target

### Project Structure
```
src/
  components/          # Reusable UI components
    ui/                 # Design system (Button, Card, Input, etc.)
    layout/             # App shell, navigation, headers
    charts/             # Chart components
  pages/                # Route pages
    auth/               # Login, Register
    dashboard/          # Home screen
    workout/            # Active workout, history
    routines/           # Routine builder, list
    exercises/          # Exercise library
    analytics/          # Charts, stats
    body/               # Measurements, photos
    tools/              # Plate calculator, export
  stores/               # Global state management
    authStore.ts
    workoutStore.ts
    routineStore.ts
    exerciseStore.ts
    analyticsStore.ts
    bodyStore.ts
    syncStore.ts
  db/                   # Database layer
    schema.sql           # Turso schema
    client.ts            # Turso connection
    localDb.ts           # IndexedDB wrapper
    migrations/          # Schema migrations
    seed/                # Exercise seed data
  lib/                   # Utilities
    auth.ts              # JWT helpers
    offline.ts           # Online/offline detection
    calculations.ts      # 1RM, volume, plate math
    export.ts            # CSV export
    constants.ts         # App constants
  types/                 # TypeScript definitions
    index.ts
  App.tsx
  index.tsx
  index.css
public/
  manifest.json          # PWA manifest
  sw.js                  # Service worker (or use vite-plugin-pwa)
```

## Database Schema (Turso)

### users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### exercises
```sql
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, -- NULL for preset exercises
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  equipment TEXT,
  instructions TEXT,
  is_custom INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### routines
```sql
CREATE TABLE routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### routine_exercises
```sql
CREATE TABLE routine_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  target_sets INTEGER DEFAULT 3,
  target_reps INTEGER DEFAULT 10,
  rest_seconds INTEGER DEFAULT 60,
  FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
```

### workouts
```sql
CREATE TABLE workouts (
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
);
```

### workout_exercises
```sql
CREATE TABLE workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  notes TEXT,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id)
);
```

### sets
```sql
CREATE TABLE sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_exercise_id INTEGER NOT NULL,
  set_type TEXT DEFAULT 'normal', -- warmup, normal, drop_set, failure, superset
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  rpe INTEGER, -- 1-10
  is_completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);
```

### body_measurements
```sql
CREATE TABLE body_measurements (
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
);
```

### progress_photos
```sql
CREATE TABLE progress_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Feature Implementation Order

### Phase 1: Foundation (Critical)
1. Project setup, dependencies, PWA config
2. Database schema + Turso connection
3. IndexedDB local layer
4. Auth (register/login/JWT)
5. Design system + layout shell
6. Navigation + routing

### Phase 2: Core Workout Features (Critical)
7. Exercise library (preset data + CRUD)
8. Routine builder
9. Workout logger (active workout screen)
10. Rest timer
11. Set types + RPE
12. Previous performance reference
13. Workout history

### Phase 3: Analytics (Critical)
14. Volume tracking charts
15. 1RM estimation
16. Muscle group distribution
17. Training calendar
18. Strength levels

### Phase 4: Body Tracking (Medium)
19. Body measurements logging
20. Progress photos
21. Weight averaging

### Phase 5: Utilities (Medium)
22. Plate calculator
23. CSV export
24. Data import

### Phase 6: Polish (High)
25. Offline sync robustness
26. PWA install prompts
27. Performance optimization
28. Theme consistency
29. Edge case handling
30. Final testing

## Design System (UberEats-inspired)
- **Colors**: 
  - Primary: `#06C167` (UberEats green)
  - Dark bg: `#000000` / `#1a1a1a`
  - Light bg: `#FFFFFF` / `#F6F6F6`
  - Text: `#333333` (light), `#FFFFFF` (dark)
  - Accents: `#FF4D00` (orange for actions)
- **Typography**: System font stack, clean sans-serif
- **Components**: Cards with subtle shadows, rounded corners, bottom sheets for actions
- **Layout**: Mobile-first, tab bar at bottom, clean headers

## Authentication Flow
1. User registers with username/email/password
2. Server hashes password with bcrypt
3. Server returns JWT (access + refresh tokens)
4. Client stores JWT in httpOnly cookie or localStorage
5. All API requests include Bearer token
6. OAuth ready: structure allows adding Google OAuth later

## Offline Sync Strategy
- Queue all mutations in IndexedDB `sync_queue` table
- When online, process queue and send to Turso
- Use timestamps for conflict resolution
- Show sync status indicator in UI
- Background sync when app regains connection

## Notes for Future Sessions
- The app is offline-first; Turso is the sync target
- All features listed in the spec must work without defects
- PWA should be installable on mobile
- Theme switching must persist across sessions
- Auth is JWT-based, OAuth-ready architecture
