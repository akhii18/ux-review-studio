# UXM Co-Pilot — Phase 1

Turborepo monorepo for the UXM Co-Pilot platform. Phase 1 delivers:
- **Findings & Triage** — filter, sort, paginate, and triage AI findings
- **Checklists & Governance** — versioned checklists with approval workflow
- **UX Principles** — searchable library with enable/disable and custom principles
- **Settings** — persisted review defaults and pipeline configuration

---

## Structure

```
uxm-copilot/
├── apps/
│   ├── web/          # Next.js 14 App Router frontend
│   └── api/          # Express.js backend
├── packages/
│   └── shared/       # Types, Zod schemas, constants
├── turbo.json
└── docker-compose.yml
```

---

## Quick start (local)

### 1. Clone and install

```bash
git clone <repo>
cd uxm-copilot
npm install
```

### 2. Configure environment

```bash
# API
cp apps/api/.env.example apps/api/.env
# Fill in your Supabase DATABASE_URL and DIRECT_URL

# Web
cp apps/web/.env.local.example apps/web/.env.local
# NEXT_PUBLIC_API_URL defaults to http://localhost:4000
```

### 3. Migrate & seed database

```bash
cd apps/api
npx prisma migrate dev --name init
npm run db:seed
```

### 4. Run dev servers

```bash
# From repo root (runs both api + web in parallel)
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

---

## Quick start (Docker)

```bash
# Copy and fill in env
cp .env.example apps/api/.env

docker-compose up --build
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/reviews/:id/findings` | Paginated findings with filter/sort |
| `GET` | `/api/reviews/:id/findings/grouped` | Findings grouped by review area |
| `GET` | `/api/reviews/:id/findings/untriaged` | Next untriaged finding (by severity) |
| `PATCH` | `/api/findings/:id` | Update finding fields |
| `PATCH` | `/api/findings/:id/triage` | Triage action (ACCEPT/EDIT/DISMISS/ESCALATE) |
| `POST` | `/api/findings/:id/escalate` | Escalate with reason |
| `GET` | `/api/findings/recurring` | Recurring finding trends |
| `GET` | `/api/checklists` | List all checklists |
| `POST` | `/api/checklists` | Create checklist |
| `GET` | `/api/checklists/:id` | Get checklist with history |
| `PATCH` | `/api/checklists/:id` | Update checklist (DRAFT only) |
| `POST` | `/api/checklists/:id/approve` | Approve checklist |
| `GET` | `/api/principles` | List principles (filterable by category/enabled) |
| `POST` | `/api/principles` | Create custom principle |
| `PATCH` | `/api/principles/:id` | Update principle (enable/disable/edit) |
| `GET` | `/api/settings` | Get all settings |
| `PATCH` | `/api/settings` | Update settings (upsert) |

---

## Frontend Routes

| Route | Description |
|-------|-------------|
| `/` → `/dashboard` | Dashboard with quick-nav |
| `/reviews/[id]` | Finding triage workspace |
| `/checklists` | Checklist grid |
| `/checklists/new` | Create checklist |
| `/checklists/[id]` | Checklist detail + approval |
| `/principles` | Principle library |
| `/settings` | Settings form |

---

## Technology

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, App Router, TypeScript, Tailwind CSS, Redux Toolkit, RTK Query, React Hook Form, Zod |
| Backend | Express.js, TypeScript, Prisma ORM |
| Database | Supabase PostgreSQL |
| Shared | `@uxm/shared` — types, Zod schemas, constants |
| Monorepo | Turborepo |

---

## Migration from UX Review Studio

The original project (TanStack Start + SQLite) was analysed and the following assets were preserved:

- All 30+ shadcn/ui components copied verbatim into `apps/web/components/ui/`
- `FindingDetail` panel → `FindingCard` component
- Triage action buttons → `TriageControls` component  
- `COMMON_STANDARDS` basis library → `REVIEW_BASIS_LIBRARY` constant in `packages/shared`
- All Zod validator schemas migrated to `packages/shared/schemas`
- Domain type aliases migrated to `packages/shared/types`
- Analytics SQL queries → ported to Prisma in repositories

The following were **not** migrated (intentional — excluded from Phase 1):
- `createServerFn` RPC layer → replaced by Express REST APIs
- LibSQL/SQLite → replaced by Supabase PostgreSQL + Prisma
- TanStack Router → replaced by Next.js App Router
- TanStack Query → replaced by RTK Query
- AI orchestrator and agent pipeline
- File upload and report generation

---

## Phase 2 scope (not yet implemented)

Authentication (Azure AD / MSAL), AI Review Engine (Azure OpenAI), Reports & Export, Analytics, BullMQ background jobs, Socket.IO real-time, Figma Integration, Recording Analysis.
