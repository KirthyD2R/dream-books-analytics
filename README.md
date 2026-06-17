# Dream Books · Analytics

An analytics dashboard for **Dream Books** — tracks how much data users create and how
active they are. Built with **Next.js (App Router) + TypeScript + Drizzle ORM + PostgreSQL**,
charts by **Recharts**.

## What it tracks

**Data volume & counts**
- Total users, dream books, dream entries, and words written
- New users / new entries in the last 30 days
- Averages: entries per user, entries per book
- Daily entries-created trend (30 days)
- Top creators (users by entries written)
- Mood mix of entries

**User activity & growth**
- DAU / WAU / MAU (distinct users with a session in the last 1 / 7 / 30 days)
- Stickiness (DAU ÷ MAU)
- Daily signups trend (30 days)

> The metric set is driven entirely by `src/db/analytics.ts`. Add a query there and a
> card/chart in `src/app/page.tsx` — the UI has no business logic.

## Data model

Defined in [`src/db/schema.ts`](src/db/schema.ts). Tables:
`users`, `dream_books`, `dream_entries`, `tags`, `dream_entry_tags`, `user_sessions`.

The schema is meant to **grow sprint by sprint**. When you add a table or column,
keep a `created_at` (and `last_active_at` / session rows for activity) so the
analytics queries keep working without changes.

## Setup

```bash
# 1. Install
npm install

# 2. Configure the database
cp .env.example .env
#   then edit DATABASE_URL to point at your Postgres DB

# 3. Create the tables (for a fresh DB)
npm run db:push          # or: npm run db:generate && npm run db:migrate

# 4. (optional) Load demo data so the dashboard isn't empty
npm run db:seed

# 5. Run
npm run dev              # http://localhost:3005
```

### Pointing at an existing Dream Books database

If the tables already exist with different names/columns, either:
- adjust [`src/db/schema.ts`](src/db/schema.ts) to match the real columns, then skip
  `db:push` and just run the app; or
- run `npx drizzle-kit pull` to introspect the live DB into a schema and reconcile.

The analytics layer only depends on these columns existing:
`users.created_at`, `users.last_active_at`, `dream_books.created_at`,
`dream_entries.created_at | user_id | book_id | mood | word_count`,
`user_sessions.user_id | started_at`.

## API

`GET /api/analytics` returns the full dashboard payload as JSON.

## Project layout

```
src/
  db/
    schema.ts      # Drizzle tables — the data model (extend each sprint)
    client.ts      # shared postgres connection + Drizzle instance
    analytics.ts   # all metric queries (SQL aggregations)
    seed.ts        # demo data generator (npm run db:seed)
  app/
    page.tsx       # the dashboard (server component)
    api/analytics/route.ts
  components/
    Charts.tsx     # Recharts (client)
    StatCard.tsx
```
