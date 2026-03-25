# SocialConnect

A full-stack social media web application built with **Next.js-style architecture** using React + Vite (frontend) and Express 5 (backend), with PostgreSQL for persistence.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables (.env)](#environment-variables-env)
- [Database Setup (Real PostgreSQL)](#database-setup-real-postgresql)
  - [Option A — Supabase (Recommended for Assessment)](#option-a--supabase-recommended-for-assessment)
  - [Option B — Local PostgreSQL](#option-b--local-postgresql)
  - [Option C — Any Hosted PostgreSQL (Neon, Railway, etc.)](#option-c--any-hosted-postgresql-neon-railway-etc)
- [Running the Project Locally](#running-the-project-locally)
- [API Endpoints Reference](#api-endpoints-reference)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Image Uploads](#image-uploads)
- [Deployment](#deployment)

---

## Features

- **JWT Authentication** — Register, login (email or username), logout
- **User Profiles** — Bio (max 160 chars), avatar, website, location, follower/following/posts counts
- **Posts** — Create, edit, delete posts (max 280 chars) with optional image (JPEG/PNG, max 2 MB)
- **Social** — Like/unlike posts, add/delete comments
- **Personalized Feed** — Chronological feed from followed users (falls back to all public posts)
- **Follow System** — Follow/unfollow users, view followers and following lists
- **Avatar Upload** — Upload profile picture (multipart/form-data)
- **Denormalized Counts** — `like_count` and `comment_count` on posts kept in sync on every like/comment action

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing) |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (`jsonwebtoken`) + password hashing (`bcryptjs`) |
| File uploads | multer (stored locally in `artifacts/api-server/uploads/`) |
| API contract | OpenAPI 3.1 → Orval codegen (React Query hooks + Zod schemas) |
| Package manager | pnpm workspaces (monorepo) |

---

## Project Structure

```
socialconnect/
├── artifacts/
│   ├── api-server/                  # Express API server
│   │   ├── src/
│   │   │   ├── app.ts               # Express app setup, middleware
│   │   │   ├── index.ts             # Entry point (reads PORT env var)
│   │   │   ├── lib/
│   │   │   │   ├── jwt.ts           # JWT sign/verify (reads SESSION_SECRET)
│   │   │   │   ├── imageStorage.ts  # Local file storage for uploads
│   │   │   │   └── logger.ts        # Pino structured logger
│   │   │   ├── middlewares/
│   │   │   │   └── auth.ts          # requireAuth middleware (Bearer token)
│   │   │   └── routes/
│   │   │       ├── auth.ts          # /api/auth/*
│   │   │       ├── users.ts         # /api/users/*
│   │   │       ├── posts.ts         # /api/posts/*
│   │   │       └── feed.ts          # /api/feed
│   │   └── uploads/                 # Uploaded images saved here at runtime
│   └── social-connect/              # React + Vite frontend
│       └── src/
│           ├── App.tsx              # Routes (wouter)
│           ├── lib/auth.ts          # JWT helpers (localStorage)
│           ├── components/
│           │   ├── layout/MainLayout.tsx
│           │   └── post/PostCard.tsx, CreatePost.tsx
│           └── pages/
│               ├── auth/Login.tsx, Register.tsx
│               ├── Feed.tsx
│               ├── Explore.tsx
│               ├── Profile.tsx
│               └── PostDetail.tsx
├── lib/
│   ├── api-spec/openapi.yaml        # OpenAPI 3.1 spec (source of truth)
│   ├── api-client-react/            # Generated React Query hooks
│   ├── api-zod/                     # Generated Zod validation schemas
│   └── db/
│       ├── drizzle.config.ts        # Drizzle Kit config (reads DATABASE_URL)
│       └── src/schema/
│           ├── users.ts
│           ├── posts.ts
│           ├── likes.ts
│           ├── comments.ts
│           └── follows.ts
└── package.json
```

---

## Environment Variables (.env)

### Do you need a `.env` file?

**Yes** — when running locally outside Replit, you need to set environment variables. On Replit, these are managed as **Secrets** (the built-in secrets manager), so no `.env` file is committed to the repo.

> **Never commit `.env` to Git.** Add it to `.gitignore`.

### Required Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | Full PostgreSQL connection string |
| `SESSION_SECRET` | **Yes** | Secret key for signing JWT tokens. Use a long random string. |
| `PORT` | Auto-set | Port the API server listens on. Defaults are managed by the runtime. |

### Optional Variables (set automatically by PostgreSQL providers)

When using Supabase, Neon, or local Postgres, some providers also set individual connection parts. `DATABASE_URL` alone is sufficient.

| Variable | Description |
|---|---|
| `PGHOST` | Database host |
| `PGPORT` | Database port (usually 5432) |
| `PGUSER` | Database username |
| `PGPASSWORD` | Database password |
| `PGDATABASE` | Database name |

### Example `.env` file

Create a file called `.env` in the **project root**:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/socialconnect

# JWT secret — use a long random string (never share this)
SESSION_SECRET=replace-with-a-long-random-secret-string-at-least-32-chars

# Port for the API server (optional, defaults to 8080)
PORT=8080
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup (Real PostgreSQL)

The app uses **Drizzle ORM** with PostgreSQL. You need to run a schema push once after setting `DATABASE_URL`.

### Option A — Supabase (Recommended for Assessment)

The assessment spec mentions Supabase. Here's how to set it up:

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. After the project is created, go to **Project Settings → Database**.
3. Copy the **Connection string** under "URI" — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. Set it as your `DATABASE_URL` environment variable (in `.env` or Replit Secrets).
5. Push the schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

**For image storage on Supabase Storage** (optional upgrade from local file storage):

Currently images are stored locally in `artifacts/api-server/uploads/`. To store on Supabase Storage instead:

1. In Supabase dashboard → **Storage** → create a bucket called `images` (set to Public).
2. Go to **Project Settings → API** and copy your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Add them to your `.env`:
   ```env
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. Install the Supabase client in the API server:
   ```bash
   pnpm --filter @workspace/api-server add @supabase/supabase-js
   ```
5. Replace `artifacts/api-server/src/lib/imageStorage.ts` with Supabase Storage upload logic.

### Option B — Local PostgreSQL

1. Install PostgreSQL on your machine:
   - **macOS**: `brew install postgresql && brew services start postgresql`
   - **Ubuntu/Debian**: `sudo apt install postgresql && sudo service postgresql start`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

2. Create a database:
   ```bash
   psql -U postgres -c "CREATE DATABASE socialconnect;"
   ```

3. Set your `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/socialconnect
   ```

4. Push the schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

### Option C — Any Hosted PostgreSQL (Neon, Railway, etc.)

**Neon** (free tier, serverless Postgres):
1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the connection string from the dashboard
3. Set it as `DATABASE_URL` → run `pnpm --filter @workspace/db run push`

**Railway**:
1. Sign up at [railway.app](https://railway.app)
2. New project → Add PostgreSQL → copy the `DATABASE_URL` from the Variables tab
3. Set it → run `pnpm --filter @workspace/db run push`

---

## Running the Project Locally

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 — install with `npm install -g pnpm`
- A **PostgreSQL** database (see above)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/socialconnect.git
cd socialconnect

# 2. Create your .env file
cp .env.example .env
# Edit .env and fill in DATABASE_URL and SESSION_SECRET

# 3. Install dependencies
pnpm install

# 4. Push the database schema (run this once, or after schema changes)
pnpm --filter @workspace/db run push

# 5. Start the API server (terminal 1)
pnpm --filter @workspace/api-server run dev

# 6. Start the frontend (terminal 2)
pnpm --filter @workspace/social-connect run dev
```

The app will be available at:
- **Frontend**: http://localhost:21801
- **API**: http://localhost:8080/api

### Loading environment variables locally

If you use a `.env` file, load it before running the server. The simplest approach is to use `dotenv`:

```bash
# Install dotenv-cli globally (one-time)
npm install -g dotenv-cli

# Then run commands with env loaded
dotenv -- pnpm --filter @workspace/api-server run dev
```

Or add `dotenv/config` as an import to `artifacts/api-server/src/index.ts` (development only):

```typescript
// Add at the very top of artifacts/api-server/src/index.ts (dev only)
import 'dotenv/config';
```

And install it:
```bash
pnpm --filter @workspace/api-server add dotenv
```

### Useful development commands

| Command | What it does |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | Build & start API server |
| `pnpm --filter @workspace/social-connect run dev` | Start Vite dev server |
| `pnpm --filter @workspace/db run push` | Push schema changes to database |
| `pnpm --filter @workspace/db run push-force` | Force push schema (drops conflicting columns) |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate React Query hooks + Zod schemas from OpenAPI spec |
| `pnpm run typecheck` | Full TypeScript typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |

---

## API Endpoints Reference

All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login (email or username) |
| POST | `/api/auth/logout` | Yes | Logout |

**Register body:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```
- `username`: 3–30 chars, alphanumeric + underscore only (`^[a-zA-Z0-9_]+$`)
- `password`: minimum 8 characters

**Login body:**
```json
{
  "login": "john_doe",
  "password": "password123"
}
```
- `login` field accepts **email OR username**

**Auth response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ...UserProfile }
}
```

---

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Yes | List all users (paginated) |
| GET | `/api/users/:userId` | Yes | Get user profile by ID |
| PATCH | `/api/users/me` | Yes | Update own profile |
| POST | `/api/users/me/avatar` | Yes | Upload avatar image (multipart) |
| POST | `/api/users/:userId/follow` | Yes | Follow a user |
| DELETE | `/api/users/:userId/follow` | Yes | Unfollow a user |
| GET | `/api/users/:userId/followers` | Yes | Get user's followers |
| GET | `/api/users/:userId/following` | Yes | Get users a user is following |

**Update profile body (all fields optional):**
```json
{
  "bio": "Software developer & coffee lover",
  "avatar_url": "https://example.com/avatar.jpg",
  "website": "https://johndoe.com",
  "location": "San Francisco, CA",
  "first_name": "John",
  "last_name": "Doe"
}
```
- `bio`: max 160 characters

**Avatar upload** — `POST /api/users/me/avatar`:
```
Content-Type: multipart/form-data
Field: avatar (file) — JPEG or PNG, max 2 MB
```

**UserProfile response shape:**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Software developer",
  "avatar_url": "/api/uploads/avatar-1-abc123.jpg",
  "website": "https://johndoe.com",
  "location": "San Francisco",
  "posts_count": 12,
  "followers_count": 45,
  "following_count": 30,
  "is_following": false,
  "created_at": "2026-01-01T00:00:00.000Z",
  "last_login": "2026-03-25T12:00:00.000Z"
}
```

---

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | Yes | List all active posts (paginated) |
| POST | `/api/posts` | Yes | Create a post (multipart/form-data) |
| GET | `/api/posts/:postId` | Yes | Get a single post |
| PATCH | `/api/posts/:postId` | Yes | Update own post |
| DELETE | `/api/posts/:postId` | Yes | Delete own post (soft delete) |
| POST | `/api/posts/:postId/like` | Yes | Like a post |
| DELETE | `/api/posts/:postId/like` | Yes | Unlike a post |
| GET | `/api/posts/:postId/comments` | Yes | List comments on a post |
| POST | `/api/posts/:postId/comments` | Yes | Add a comment |
| DELETE | `/api/posts/:postId/comments/:commentId` | Yes | Delete own comment |

**Create post** — `POST /api/posts`:
```
Content-Type: multipart/form-data
Field: content (text, required, max 280 chars)
Field: image (file, optional — JPEG or PNG, max 2 MB)
```

**Post response shape:**
```json
{
  "id": 1,
  "content": "Hello SocialConnect!",
  "image_url": null,
  "is_active": true,
  "like_count": 5,
  "comment_count": 2,
  "is_liked": false,
  "author": {
    "id": 1,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": null
  },
  "created_at": "2026-03-25T12:00:00.000Z",
  "updated_at": "2026-03-25T12:00:00.000Z"
}
```

**Pagination** — all list endpoints support:
```
?page=1&limit=20
```
Response includes `{ total, page, limit, has_next }`.

---

### Feed

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/feed` | Yes | Personalized feed |

Returns posts from followed users chronologically. If not following anyone, shows all public posts.

---

## Database Schema

### `users` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `email` | varchar(255) UNIQUE | |
| `username` | varchar(30) UNIQUE | 3–30 chars, alphanumeric + underscore |
| `password_hash` | text | bcryptjs hash |
| `first_name` | varchar(100) | |
| `last_name` | varchar(100) | |
| `bio` | varchar(160) | nullable |
| `avatar_url` | text | nullable |
| `website` | text | nullable |
| `location` | varchar(100) | nullable |
| `followers_count` | integer | denormalized, updated on follow/unfollow |
| `following_count` | integer | denormalized, updated on follow/unfollow |
| `posts_count` | integer | denormalized, updated on post create/delete |
| `last_login` | timestamp | updated on each successful login |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `posts` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `content` | text | max 280 chars |
| `image_url` | text | nullable, local path or URL |
| `is_active` | boolean | default true, set false on delete (soft delete) |
| `like_count` | integer | denormalized |
| `comment_count` | integer | denormalized |
| `author_id` | integer FK → users | cascade delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `likes` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | integer FK → users | cascade delete |
| `post_id` | integer FK → posts | cascade delete |
| `created_at` | timestamp | |
| | UNIQUE | `(user_id, post_id)` |

### `comments` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `content` | text | max 500 chars |
| `author_id` | integer FK → users | cascade delete |
| `post_id` | integer FK → posts | cascade delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `follows` table
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `follower_id` | integer FK → users | cascade delete |
| `following_id` | integer FK → users | cascade delete |
| `created_at` | timestamp | |
| | UNIQUE | `(follower_id, following_id)` |

---

## Authentication Flow

1. **Register** — `POST /api/auth/register` → returns `access_token` + user profile
2. **Login** — `POST /api/auth/login` with email **or** username → returns `access_token` + user profile
3. **Store token** — frontend stores `access_token` in `localStorage`
4. **Authenticated requests** — every request includes header `Authorization: Bearer <access_token>`
5. **Token expiry** — tokens expire after **7 days**
6. **Logout** — `POST /api/auth/logout` (server-side is stateless; frontend removes token from localStorage)

### JWT Payload
```json
{
  "userId": 1,
  "username": "john_doe",
  "iat": 1711363200,
  "exp": 1711968000
}
```

---

## Image Uploads

### Current implementation (local storage)
Uploaded images are stored in `artifacts/api-server/uploads/` and served at `/api/uploads/<filename>`.

- Supported formats: **JPEG, PNG only**
- Maximum file size: **2 MB**
- Validated via multer's `fileFilter` (checks MIME type) and `limits.fileSize`

### Upgrading to Supabase Storage
See [Option A — Supabase](#option-a--supabase-recommended-for-assessment) above for the upgrade path.

---

## Deployment

### On Replit (current setup)
Click the **Deploy** / **Publish** button in the Replit interface. Replit handles:
- Building the frontend (Vite)
- Building and running the API server
- Database connection (via built-in PostgreSQL)
- TLS and domain routing

### On Vercel / Netlify (as per assessment)
The frontend is a standard Vite SPA — deploy it as a static site:

```bash
pnpm --filter @workspace/social-connect run build
# Output: artifacts/social-connect/dist/
```

The API server needs a separate Node.js host (Railway, Render, Fly.io, etc.):

```bash
pnpm --filter @workspace/api-server run build
# Output: artifacts/api-server/dist/index.mjs
node artifacts/api-server/dist/index.mjs
```

Set all environment variables on your hosting platform's dashboard — **do not use a `.env` file in production**.

---

## .gitignore Recommendations

Make sure these are in your `.gitignore`:

```gitignore
# Environment variables — NEVER commit these
.env
.env.local
.env.production

# Uploaded files (runtime, not source code)
artifacts/api-server/uploads/

# Build outputs
artifacts/*/dist/
node_modules/
```

---

## Security Notes

- Passwords are hashed with **bcryptjs** (cost factor 12) — never stored in plain text
- JWT secret (`SESSION_SECRET`) must be a long random string and **never committed to Git**
- All mutating endpoints require a valid Bearer token
- Users can only edit/delete their **own** posts and comments (403 Forbidden otherwise)
- Image uploads are validated for MIME type (JPEG/PNG) and file size (2 MB max)
- SQL injection is prevented by Drizzle ORM's parameterized queries
