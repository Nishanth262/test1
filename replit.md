# Workspace

## Overview

SocialConnect - A social media web application built with React + Vite (frontend) and Express 5 (backend). Users can register, create profiles, post content, like/comment on posts, follow other users, and discover content through a personalized feed.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Authentication**: JWT (jsonwebtoken + bcryptjs)
- **File uploads**: multer (stored locally in artifacts/api-server/uploads/)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Wouter routing

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── social-connect/     # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- **users** - User accounts with profile fields (bio, avatar_url, website, location, denormalized counts)
- **posts** - Content posts with image support (like_count, comment_count denormalized)
- **likes** - Post likes with unique constraint on (user_id, post_id)
- **comments** - Post comments
- **follows** - Follow relationships with unique constraint on (follower_id, following_id)

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login (email or username)
- `POST /api/auth/logout` - Logout
- `GET /api/users` - List users
- `PATCH /api/users/me` - Update own profile
- `POST /api/users/me/avatar` - Upload avatar (multipart)
- `GET /api/users/:id` - Get user profile
- `POST /api/users/:id/follow` - Follow user
- `DELETE /api/users/:id/follow` - Unfollow user
- `GET /api/users/:id/followers` - Get followers
- `GET /api/users/:id/following` - Get following
- `GET /api/posts` - List all posts (paginated)
- `POST /api/posts` - Create post (multipart, optional image)
- `GET /api/posts/:id` - Get post
- `PATCH /api/posts/:id` - Update own post
- `DELETE /api/posts/:id` - Delete own post
- `POST /api/posts/:id/like` - Like post
- `DELETE /api/posts/:id/like` - Unlike post
- `GET /api/posts/:id/comments` - List comments
- `POST /api/posts/:id/comments` - Add comment
- `DELETE /api/posts/:id/comments/:cid` - Delete own comment
- `GET /api/feed` - Personalized feed (follows-based, falls back to all posts)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — cross-package imports resolve correctly

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Development

- `pnpm --filter @workspace/api-server run dev` — run the API dev server
- `pnpm --filter @workspace/social-connect run dev` — run the frontend dev server
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client/Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Authentication

- JWT tokens stored in localStorage as `access_token`
- All protected routes require `Authorization: Bearer <token>` header
- Session secret from `SESSION_SECRET` environment variable
