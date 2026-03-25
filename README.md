# SocialConnect

A social media web application built with **Next.js / React + TypeScript**, **PostgreSQL via Supabase**, and **JWT authentication**. Users can share posts, connect with others, like and comment on content, and discover people through a personalised feed.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables — Do You Need a .env File?](#environment-variables--do-you-need-a-env-file)
- [Setting Up Supabase (Step-by-Step)](#setting-up-supabase-step-by-step)
  - [Step 1 — Create a Supabase Project](#step-1--create-a-supabase-project)
  - [Step 2 — Get Your Database URL](#step-2--get-your-database-url)
  - [Step 3 — Get Your API Keys](#step-3--get-your-api-keys)
  - [Step 4 — Create a Storage Bucket](#step-4--create-a-storage-bucket)
  - [Step 5 — Push the Database Schema](#step-5--push-the-database-schema)
- [Running Locally](#running-locally)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Image Uploads](#image-uploads)
- [Deployment — Vercel / Netlify](#deployment--vercel--netlify)
- [Security Notes](#security-notes)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | Next.js-style Express 5 + TypeScript (API-first) |
| **Frontend** | React 19 + Vite + TypeScript |
| **UI Framework** | Tailwind CSS + shadcn/ui components |
| **Database** | PostgreSQL via **Supabase** (Drizzle ORM) |
| **Authentication** | JWT — `jsonwebtoken` + `bcryptjs` |
| **File Storage** | **Supabase Storage** (images + avatars) |
| **Deployment** | Vercel (frontend) / Railway or Render (API) |
| **Package Manager** | pnpm workspaces (monorepo) |
| **API Contract** | OpenAPI 3.1 → Orval codegen (React Query hooks + Zod schemas) |

---

## Project Structure

```
socialconnect/
├── artifacts/
│   ├── api-server/                  # Express 5 API server
│   │   └── src/
│   │       ├── app.ts               # Middleware, route mounting
│   │       ├── lib/
│   │       │   ├── jwt.ts           # JWT sign/verify  (reads SESSION_SECRET)
│   │       │   ├── supabase.ts      # Supabase client  (reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
│   │       │   └── imageStorage.ts  # Upload to Supabase Storage (or local fallback)
│   │       ├── middlewares/
│   │       │   └── auth.ts          # requireAuth — validates Bearer token
│   │       └── routes/
│   │           ├── auth.ts          # /api/auth/*
│   │           ├── users.ts         # /api/users/*
│   │           ├── posts.ts         # /api/posts/*
│   │           └── feed.ts          # /api/feed
│   └── social-connect/              # React + Vite frontend
│       └── src/
│           ├── lib/auth.ts          # Token helpers (localStorage)
│           ├── components/
│           └── pages/
│               ├── auth/Login.tsx, Register.tsx
│               ├── Feed.tsx, Explore.tsx, Profile.tsx, PostDetail.tsx
├── lib/
│   ├── api-spec/openapi.yaml        # OpenAPI 3.1 — single source of truth
│   ├── api-client-react/            # Generated React Query hooks (from OpenAPI)
│   ├── api-zod/                     # Generated Zod schemas (from OpenAPI)
│   └── db/
│       ├── drizzle.config.ts        # Reads DATABASE_URL
│       └── src/schema/              # users, posts, likes, comments, follows
├── .env.example                     # Template — copy to .env and fill in
└── README.md
```

---

## Environment Variables — Do You Need a `.env` File?

### Running on Replit
No `.env` file needed. Add values in the **Secrets** panel (the lock icon in the sidebar). Every variable below maps to a secret key.

### Running locally on your own machine
Yes. Copy the template and fill in your values:

```bash
cp .env.example .env
# Open .env and fill in every value
```

> **Never commit `.env` to Git.** It is already in `.gitignore`.

### All required variables

| Variable | Required | Where to get it |
|---|---|---|
| `SUPABASE_URL` | **Yes** | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Supabase → Project Settings → API → service_role key |
| `DATABASE_URL` | **Yes** | Supabase → Project Settings → Database → Connection string (URI) |
| `SESSION_SECRET` | **Yes** | Generate yourself (see below) |
| `SUPABASE_STORAGE_BUCKET` | No | Name of your storage bucket — default: `images` |
| `PORT` | No | API server port — default: `8080` |

**Generate a SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Setting Up Supabase (Step-by-Step)

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New project**.
3. Fill in: Organisation, Project name, Database password (save this — you need it for `DATABASE_URL`), Region.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

### Step 2 — Get Your Database URL

1. In your project dashboard → **Project Settings** (gear icon, bottom left) → **Database**.
2. Scroll down to **Connection string**.
3. Select the **URI** tab.
4. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the password you set in Step 1.
6. Set this as `DATABASE_URL` in your `.env` or Replit Secrets.

> **Connection pooling note:** For production, use the **Session mode** pooler URL (port 5432), not the Transaction mode (port 6543), because Drizzle ORM uses prepared statements.

---

### Step 3 — Get Your API Keys

1. **Project Settings → API**.
2. You will see two values to copy:

   | Field | Variable name |
   |---|---|
   | **Project URL** | `SUPABASE_URL` |
   | **Project API keys → service_role** (secret) | `SUPABASE_SERVICE_ROLE_KEY` |

3. Set both in your `.env` or Replit Secrets.

> The `service_role` key has full database access and bypasses Row Level Security. **Never expose it in browser code or commit it to Git.** It is only used on the server.

---

### Step 4 — Create a Storage Bucket

Images and avatars are stored in Supabase Storage.

1. In your project → **Storage** (left sidebar).
2. Click **New bucket**.
3. Name it `images` (or any name — just set `SUPABASE_STORAGE_BUCKET` to match).
4. Set it to **Public** so uploaded images have publicly accessible URLs.
5. Click **Create bucket**.

**Set CORS for the bucket** (so your frontend can display images):

1. Storage → **Policies** tab on the `images` bucket.
2. Add a policy: allow `SELECT` (read) for `anon` role — or set the bucket to Public (already done above).

---

### Step 5 — Push the Database Schema

After setting `DATABASE_URL`, run this once to create all tables:

```bash
pnpm --filter @workspace/db run push
```

This creates: `users`, `posts`, `likes`, `comments`, `follows` tables — no manual SQL needed.

If you make schema changes later, run the same command again. Use `push-force` if you need to reset:

```bash
pnpm --filter @workspace/db run push-force
```

---

## Running Locally

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 — `npm install -g pnpm`
- A Supabase project with `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` configured

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/socialconnect.git
cd socialconnect

# 2. Create your .env file
cp .env.example .env
# Fill in all values in .env

# 3. Install all dependencies
pnpm install

# 4. Push database schema (first time only)
pnpm --filter @workspace/db run push

# 5. Start the API server  (terminal 1)
pnpm --filter @workspace/api-server run dev

# 6. Start the frontend  (terminal 2)
pnpm --filter @workspace/social-connect run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:21801 |
| API | http://localhost:8080/api |

### Loading .env automatically

Install `dotenv-cli` once globally and prefix commands:

```bash
npm install -g dotenv-cli
dotenv -- pnpm --filter @workspace/api-server run dev
```

Or add `import 'dotenv/config'` at the top of `artifacts/api-server/src/index.ts`.

### Common development commands

| Command | What it does |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | Build + start API server |
| `pnpm --filter @workspace/social-connect run dev` | Start Vite frontend dev server |
| `pnpm --filter @workspace/db run push` | Apply schema changes to DB |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate React Query hooks + Zod schemas |
| `pnpm run typecheck` | Full TypeScript check across all packages |
| `pnpm run build` | Typecheck + build everything |

---

## API Endpoints

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login (email or username + password) |
| POST | `/api/auth/logout` | Yes | Logout (client removes token) |

**Register request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}
```
- `username`: 3–30 chars, only letters, digits, underscore (`^[a-zA-Z0-9_]+$`)
- `password`: minimum 8 characters

**Login request** — `login` field accepts **email OR username**:
```json
{
  "login": "john_doe",
  "password": "password123"
}
```

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
| GET | `/api/users` | Yes | List all users (`?page=1&limit=20`) |
| GET | `/api/users/:userId` | Yes | Get user profile |
| PATCH | `/api/users/me` | Yes | Update own profile |
| POST | `/api/users/me/avatar` | Yes | Upload avatar (`multipart/form-data`) |
| POST | `/api/users/:userId/follow` | Yes | Follow a user |
| DELETE | `/api/users/:userId/follow` | Yes | Unfollow a user |
| GET | `/api/users/:userId/followers` | Yes | List followers |
| GET | `/api/users/:userId/following` | Yes | List users being followed |

**Update profile body (all fields optional):**
```json
{
  "bio": "Software developer",
  "avatar_url": "https://...",
  "website": "https://johndoe.com",
  "location": "London, UK",
  "first_name": "John",
  "last_name": "Doe"
}
```
- `bio`: max 160 characters

**Avatar upload** — `POST /api/users/me/avatar`:
- `Content-Type: multipart/form-data`
- Field name: `avatar`
- Accepted: JPEG, PNG — max 2 MB
- Returns: `{ "avatar_url": "https://...", "message": "Avatar uploaded successfully" }`

---

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | Yes | List all posts (`?page=1&limit=20`) |
| POST | `/api/posts` | Yes | Create post (`multipart/form-data`) |
| GET | `/api/posts/:postId` | Yes | Get single post |
| PATCH | `/api/posts/:postId` | Yes | Update own post (content only) |
| DELETE | `/api/posts/:postId` | Yes | Soft-delete own post |
| POST | `/api/posts/:postId/like` | Yes | Like a post |
| DELETE | `/api/posts/:postId/like` | Yes | Unlike a post |
| GET | `/api/posts/:postId/comments` | Yes | List comments |
| POST | `/api/posts/:postId/comments` | Yes | Add a comment |
| DELETE | `/api/posts/:postId/comments/:commentId` | Yes | Delete own comment |

**Create post** — `POST /api/posts`:
- `Content-Type: multipart/form-data`
- `content` (text, required, max 280 chars)
- `image` (file, optional — JPEG/PNG, max 2 MB)

**Post object shape:**
```json
{
  "id": 1,
  "content": "Hello SocialConnect!",
  "image_url": "https://xxxx.supabase.co/storage/v1/object/public/images/post-xxx.jpg",
  "is_active": true,
  "like_count": 5,
  "comment_count": 2,
  "is_liked": false,
  "author": {
    "id": 1,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "https://xxxx.supabase.co/storage/v1/object/public/images/avatar-1-abc.jpg"
  },
  "created_at": "2026-03-25T12:00:00.000Z",
  "updated_at": "2026-03-25T12:00:00.000Z"
}
```

---

### Feed

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/feed` | Yes | Personalised chronological feed |

- Returns posts from followed users when you follow someone.
- Falls back to all public posts when following no one.
- Supports `?page=1&limit=20`.

---

### Pagination

All list endpoints return:
```json
{
  "posts": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "has_next": true
}
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `email` | varchar(255) UNIQUE | |
| `username` | varchar(30) UNIQUE | 3–30 chars, `^[a-zA-Z0-9_]+$` |
| `password_hash` | text | bcryptjs, cost factor 12 |
| `first_name` | varchar(100) | |
| `last_name` | varchar(100) | |
| `bio` | varchar(160) | nullable, max 160 chars |
| `avatar_url` | text | nullable, Supabase Storage public URL |
| `website` | text | nullable |
| `location` | varchar(100) | nullable |
| `followers_count` | integer | denormalized — synced on follow/unfollow |
| `following_count` | integer | denormalized — synced on follow/unfollow |
| `posts_count` | integer | denormalized — synced on post create/delete |
| `last_login` | timestamp | updated on every successful login |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `posts`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `content` | text | max 280 chars |
| `image_url` | text | nullable, Supabase Storage public URL |
| `is_active` | boolean | soft delete: set false on DELETE |
| `like_count` | integer | denormalized — synced on like/unlike |
| `comment_count` | integer | denormalized — synced on comment add/delete |
| `author_id` | FK → users | cascade delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `likes`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `user_id` | FK → users | cascade delete |
| `post_id` | FK → posts | cascade delete |
| `created_at` | timestamp | |
| UNIQUE | | `(user_id, post_id)` — one like per user per post |

### `comments`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `content` | text | max 500 chars |
| `author_id` | FK → users | cascade delete |
| `post_id` | FK → posts | cascade delete |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `follows`

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `follower_id` | FK → users | cascade delete |
| `following_id` | FK → users | cascade delete |
| `created_at` | timestamp | |
| UNIQUE | | `(follower_id, following_id)` — one follow per pair |

---

## Authentication Flow

1. **Register** → POST `/api/auth/register` → server creates user, returns `access_token` + profile
2. **Login** → POST `/api/auth/login` with email **or** username → returns `access_token` + profile
3. **Store token** → frontend saves `access_token` to `localStorage`
4. **Use token** → every request includes `Authorization: Bearer <access_token>`
5. **Token expiry** → 7 days
6. **Logout** → POST `/api/auth/logout` → frontend removes token from `localStorage`

Passwords are hashed with **bcryptjs** (cost factor 12). Tokens are signed with **HS256** using your `SESSION_SECRET`.

---

## Image Uploads

### With Supabase Storage (production — recommended)

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set:
- Files are uploaded to your Supabase Storage bucket (`images` by default)
- `image_url` / `avatar_url` in the database will be the full public Supabase URL:
  `https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/images/filename.jpg`

**Constraints enforced on every upload:**
- Accepted formats: **JPEG, PNG only** (checked via MIME type)
- Maximum file size: **2 MB**

### Without Supabase Storage (local development fallback)

If `SUPABASE_URL` is not set, images are saved to `artifacts/api-server/uploads/` and served at `/api/uploads/<filename>`. This is for running locally without a Supabase project.

---

## Deployment — Vercel / Netlify

### Frontend → Vercel or Netlify

Build the static frontend:
```bash
pnpm --filter @workspace/social-connect run build
# Output: artifacts/social-connect/dist/
```

Deploy the `dist/` folder as a static site. Set the base path to `/` and configure SPA routing (all paths → `index.html`).

### API Server → Railway / Render / Fly.io

```bash
pnpm --filter @workspace/api-server run build
# Output: artifacts/api-server/dist/index.mjs
```

Start command: `node artifacts/api-server/dist/index.mjs`

Set these environment variables on your hosting platform dashboard:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=images
DATABASE_URL=...
SESSION_SECRET=...
PORT=8080
```

---

## Security Notes

| Concern | Implementation |
|---|---|
| Password storage | bcryptjs, cost factor 12 — never plain text |
| Token signing | HS256 JWT, signed with `SESSION_SECRET` |
| Token scope | Server-side only (`SUPABASE_SERVICE_ROLE_KEY` never sent to browser) |
| Ownership checks | Users can only edit/delete their **own** posts and comments (403 otherwise) |
| File validation | MIME type check + 2 MB size limit on every upload |
| SQL injection | Prevented by Drizzle ORM parameterized queries |
| Secrets in Git | `.env` is in `.gitignore` — never commit credentials |

---

## .gitignore Checklist

Make sure these lines are in your `.gitignore`:

```gitignore
# Secrets
.env
.env.local
.env.production

# Uploaded files (local dev fallback)
artifacts/api-server/uploads/

# Build outputs
artifacts/*/dist/
node_modules/
*.tsbuildinfo
```
