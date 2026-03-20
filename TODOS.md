# TODOS

## P1 - Critical

### ~~Fix A2A response format validation~~ (DONE — PR2)
~~`sendA2AMessage` does not validate response structure.~~
Fixed: extracted `extractA2AResponseText` with full structural validation, typed errors for null/array/empty results.

### ~~Make scoreboard + watch pages publicly accessible~~ (DONE — PR4)
~~Remove `/scoreboard` and `/watch` from `PROTECTED_ROUTES`.~~
Fixed: removed `/scoreboard` from PROTECTED_ROUTES, event API GET allows unauthenticated access.

## P2 - Important

### Add Sentry error tracking
Integrate Sentry SDK to capture unhandled exceptions, especially for unattended Cron jobs.
- **Why:** Daily auto events run without supervision. Errors need proactive notification.
- **Where to start:** `npm install @sentry/nextjs`, configure in `next.config.ts` and `instrumentation.ts`.
- **Effort:** S (CC ~15min)
- **Depends on:** Nothing

## P3 - Nice to have

### Refactor JSON-in-String data model
Migrate `interests` (Agent, A2AAgent) and `participantIds` (Event) from JSON strings to Postgres JSON type or relational fields.
- **Why:** Currently cannot query "all agents who like cooking" at the DB level. Blocks future recommendation and search features.
- **Where to start:** `prisma/schema.prisma` — change field types, add migration, update all callers in `src/lib/matchmaker.ts`, `src/app/api/agents/`.
- **Effort:** M (CC ~20min)
- **Depends on:** Nothing
