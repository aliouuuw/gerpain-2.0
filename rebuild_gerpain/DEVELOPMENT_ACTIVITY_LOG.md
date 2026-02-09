# Development Activity Log – Gerpain ERP Rebuild

This log records notable development activities and architectural decisions for traceability.

---

## 2025-11-15

- **Docs – Stack alignment**
  - Updated `README.md` and `ARCHITECTURE.md` to reflect:
    - Backend: Hono + PostgreSQL + Drizzle
    - Frontend: Next.js 16 + TailwindCSS + TanStack Query
    - Auth direction: Better Auth + Hono (planned), French-only UI for MVP.

- **Next.js Frontend – Initial Setup**
  - Created `nextjs_frontend` app with Next.js 16 (App Router) and Tailwind 4.
  - Configured root layout with Geist fonts and `lang="fr"`.

- **Next.js Frontend – Slice 1 Auth Shell**
  - Implemented redirect from `/` to `/login`.
  - Added `(auth)` segment with:
    - `app/(auth)/layout.tsx`: public auth layout handling session redirect.
    - `app/(auth)/login/page.tsx`: French login form.
  - Added `(app)` segment with:
    - `app/(app)/layout.tsx`: authenticated app shell (header, user info, logout).
    - `app/(app)/dashboard/page.tsx`: placeholder dashboard in French.

- **Auth Integration – Temporary Strategy**
  - Decided to **reuse existing Lucia-based auth endpoints** for now to move faster on the frontend.
  - Implemented `lib/auth-client.ts` as a thin wrapper over Hono endpoints:
    - `POST /api/v1/auth/signin` (login)
    - `POST /api/v1/auth/signout` (logout)
    - `GET /api/v1/auth/profile` (session/user)
  - Updated auth layouts and login page to use this wrapper (`signInWithEmail`, `signOut`, `useSession`).

- **Better Auth – Future Direction**
  - Documented Better Auth installation and Hono integration in:
    - `better-auth-intsallation.md`
    - `better-auth-hono.md`
  - Decision: integrate Better Auth on the backend **after** core frontend MVP flows are built and stable.

---

To add a new entry, append a dated section with:
- Area (Frontend / Backend / Docs / DevOps)
- Short description of what changed and why
- Links to relevant files if helpful.
