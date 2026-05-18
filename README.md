# Liftoff - Hevy Clone

Production-ready PWA workout tracking app built with SolidJS + TypeScript + Turso.

## Quick Start

```bash
# Install dependencies
bun install

# Setup database (run once)
bun run setup:db

# Run dev (starts both frontend and backend)
bun run dev

# Or run separately:
bun run dev:server  # Backend on port 3000
bun run dev:client  # Frontend on port 5173

# Build for production
bun run build

# Start production server
bun run start
```

## Architecture

- **Frontend**: SolidJS SPA with offline-first IndexedDB caching
- **Backend**: Hono API server with Turso (libSQL) database
- **Auth**: JWT-based, extensible to OAuth
- **PWA**: Installable with service worker and manifest

## Features Implemented

### Core Features
- [x] User Authentication (register/login/JWT)
- [x] Exercise Library (53 preset + custom exercises)
- [x] Routine Builder (create, edit, delete routines with exercises)
- [x] Workout Logger
  - [x] Empty workout start
  - [x] Exercise picker with 53+ exercises
  - [x] Set tracking (weight, reps, RPE)
  - [x] Set types: warmup, normal, drop set, failure, superset
  - [x] Rest timer with skip/add time controls
  - [x] Workout notes
  - [x] Save completed workouts
- [x] Workout History (view, delete past workouts)
- [x] Previous performance reference (exercise detail page shows history)

### Analytics
- [x] Volume tracking over time (7d, 30d, 90d, 1y)
- [x] Muscle group distribution (sets and volume per muscle)
- [x] Strength levels (Bench, Squat, Deadlift)
- [x] Training calendar (visual grid)
- [x] Workout streak tracking

### Body Tracking
- [x] Weight logging
- [x] Body fat % tracking
- [x] Full body measurements (neck, chest, waist, hips, biceps, forearms, thighs, calves)
- [x] Weekly weight averaging

### Utilities
- [x] Plate calculator (lb/kg support)
- [x] CSV data export

### UI/UX
- [x] UberEats-inspired design system
- [x] Dark/Light theme toggle
- [x] Mobile-first responsive layout
- [x] Bottom navigation bar
- [x] PWA installable
- [x] Service worker for offline support
- [x] IndexedDB local storage layer

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SolidJS 1.9, TypeScript, Tailwind CSS |
| Routing | @solidjs/router |
| State | SolidJS signals + stores |
| Backend | Hono 4.x, Node.js |
| Database | Turso (libSQL) |
| Auth | JWT (jose + bcryptjs) |
| PWA | Vite PWA Plugin, Workbox |
| Icons | Lucide Solid |

## Project Structure

```
/
├── src/                          # Frontend SolidJS app
│   ├── components/
│   │   └── layout/
│   │       └── AppLayout.tsx     # App shell with nav, header, theme
│   ├── pages/                    # Route pages
│   │   ├── auth/                 # Login, Register
│   │   ├── dashboard/            # Home screen with stats
│   │   ├── workout/              # Active workout + history
│   │   ├── routines/             # List + builder
│   │   ├── exercises/            # Library + detail
│   │   ├── analytics/            # Charts + stats
│   │   ├── body/                 # Measurements
│   │   └── tools/                # Plate calc, export
│   ├── stores/                   # Global state
│   │   ├── authStore.ts          # Auth + API client
│   │   ├── themeStore.ts         # Dark/light mode
│   │   └── localDb.ts            # IndexedDB wrapper
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── App.tsx                   # Router setup
│   └── index.tsx                 # Entry point
├── server/                       # Backend Hono API
│   ├── index.ts                  # Server entry
│   ├── db.ts                     # Turso connection + schema
│   ├── types.ts                  # Hono context types
│   ├── setup.ts                  # DB initialization script
│   ├── seed/
│   │   └── exercises.ts          # 53 preset exercises
│   └── routes/
│       ├── auth.ts               # Register, login, verify
│       ├── exercises.ts          # CRUD exercises
│       ├── routines.ts           # CRUD routines
│       ├── workouts.ts           # CRUD workouts + history
│       ├── analytics.ts          # Stats + calculations
│       ├── body.ts               # Measurements + photos
│       └── tools.ts              # Plate calc + export
├── public/                       # Static assets
│   ├── manifest.json             # PWA manifest
│   ├── icon-192x192.svg          # PWA icon
│   └── icon-512x512.svg          # PWA icon
├── vite.config.ts                # Vite + PWA config
├── tailwind.config.js            # Design tokens
├── tsconfig.json                 # Frontend TS config
├── tsconfig.server.json          # Backend TS config
└── package.json
```

## Database Schema

### Tables
- `users` - accounts with bcrypt passwords
- `exercises` - preset (53) + custom exercises with muscle groups
- `routines` - workout templates
- `routine_exercises` - exercises within routines with targets
- `workouts` - logged training sessions
- `workout_exercises` - exercises within workouts
- `sets` - individual sets with type, reps, weight, RPE
- `body_measurements` - weight, body fat, circumference tracking
- `progress_photos` - progress photo storage

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/exercises` | List exercises |
| POST | `/api/exercises` | Create custom exercise |
| GET | `/api/routines` | List routines |
| POST | `/api/routines` | Create routine |
| GET | `/api/workouts` | List workouts |
| POST | `/api/workouts` | Log workout |
| GET | `/api/analytics/volume` | Volume data |
| GET | `/api/analytics/muscles` | Muscle distribution |
| GET | `/api/analytics/streak` | Workout streak |
| GET | `/api/body/measurements` | Body metrics |
| POST | `/api/body/measurements` | Log measurement |
| POST | `/api/tools/plate-calculator` | Calculate plates |
| GET | `/api/tools/export` | Export CSV |

## Environment Variables

```env
# Server
TURSO_URL=libsql://liftoff-sosokker.aws-ap-northeast-1.turso.io
TURSO_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-secret-key
PORT=3000

# Client (optional, for production)
VITE_API_URL=http://localhost:3000
```

## Deployment

### Frontend (Static Hosting)
```bash
bun run build
# Deploy dist/ to any static host (Vercel, Netlify, Cloudflare Pages)
```

### Backend (Node.js/VPS)
```bash
bun run build:server
# Start with PM2, systemd, or Docker
bun run start
```

### Full Stack (Cloudflare Workers + Pages)
The Hono backend can be adapted for Cloudflare Workers by switching `@hono/node-server` to the Workers adapter.

## Auth Architecture

Current: Username/password with JWT (7-day expiry)
- Passwords hashed with bcrypt (12 rounds)
- JWT signed with HS256
- Token stored in localStorage
- Auto-redirect to login when session expires
- Ready for OAuth extension:
  - Add `oauth_provider` and `oauth_id` to users table
  - Add `/api/auth/oauth/:provider` routes
  - Use same JWT issuance flow

## Offline Strategy

The app includes an IndexedDB layer (`src/stores/localDb.ts`) ready for full offline support:
- All data reads/writes can be queued locally
- Background sync when online
- Conflict resolution via timestamps
- Currently: API-first with local cache scaffolding

## For Future Sessions

### Immediate Next Steps (if needed)
1. Add OAuth (Google) login - extend auth routes
2. Complete offline sync - implement queue processing
3. Add progress photos upload - currently backend ready
4. Add 1RM calculation formulas - currently shows estimated
5. Add exercise video/embed support

### Turso Connection
- URL: `libsql://liftoff-sosokker.aws-ap-northeast-1.turso.io`
- Token: Embedded in `server/db.ts`
- Schema auto-created on first run via `server/setup.ts`

### Known Limitations
- Icons are SVG files (use PNG for broader PWA support)
- No email verification on registration
- Progressive photo upload stores base64 in DB (consider external storage)
- No social features (by design per requirements)

## Credits

Built as a Hevy clone focused on core workout tracking functionality.
