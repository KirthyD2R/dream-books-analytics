import { sql, gte, count, countDistinct } from "drizzle-orm";
import { db } from "./client";
import { users, dreamBooks, dreamEntries, userSessions } from "./schema";

/**
 * Analytics queries for the Dream Books dashboard.
 *
 * Two themes (the metrics chosen for the dashboard):
 *   1. Data volume & counts  — how much data users create
 *   2. User activity & growth — signups, active users, retention
 *
 * Everything is computed in SQL (aggregations / GROUP BY) so the dashboard
 * stays fast as the tables grow. Add new metrics here, not in the UI.
 */

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type Totals = {
  totalUsers: number;
  totalBooks: number;
  totalEntries: number;
  totalWords: number;
  avgEntriesPerUser: number;
  avgEntriesPerBook: number;
  newUsers30d: number;
  newEntries30d: number;
};

/** Headline counts — the "data volume" KPIs shown as stat cards. */
export async function getTotals(): Promise<Totals> {
  const [u] = await db.select({ c: count() }).from(users);
  const [b] = await db.select({ c: count() }).from(dreamBooks);
  const [e] = await db
    .select({
      c: count(),
      words: sql<number>`coalesce(sum(${dreamEntries.wordCount}), 0)`,
    })
    .from(dreamEntries);

  const [nu] = await db
    .select({ c: count() })
    .from(users)
    .where(gte(users.createdAt, daysAgo(30)));
  const [ne] = await db
    .select({ c: count() })
    .from(dreamEntries)
    .where(gte(dreamEntries.createdAt, daysAgo(30)));

  const totalUsers = u.c;
  const totalBooks = b.c;
  const totalEntries = e.c;

  return {
    totalUsers,
    totalBooks,
    totalEntries,
    totalWords: Number(e.words),
    avgEntriesPerUser: totalUsers ? +(totalEntries / totalUsers).toFixed(1) : 0,
    avgEntriesPerBook: totalBooks ? +(totalEntries / totalBooks).toFixed(1) : 0,
    newUsers30d: nu.c,
    newEntries30d: ne.c,
  };
}

export type DailyPoint = { date: string; signups: number; entries: number };

/**
 * Daily signups vs. entries created over the last `days` days.
 * Powers the growth/volume time-series chart. Zero-fills gaps so the
 * line chart has a continuous x-axis.
 */
export async function getDailySeries(days = 30): Promise<DailyPoint[]> {
  const since = daysAgo(days - 1);

  const signups = await db
    .select({
      day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
      c: count(),
    })
    .from(users)
    .where(gte(users.createdAt, since))
    .groupBy(sql`1`);

  const entries = await db
    .select({
      day: sql<string>`to_char(${dreamEntries.createdAt}, 'YYYY-MM-DD')`,
      c: count(),
    })
    .from(dreamEntries)
    .where(gte(dreamEntries.createdAt, since))
    .groupBy(sql`1`);

  const signupMap = new Map(signups.map((r) => [r.day, r.c]));
  const entryMap = new Map(entries.map((r) => [r.day, r.c]));

  const out: DailyPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = daysAgo(days - 1 - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: key,
      signups: signupMap.get(key) ?? 0,
      entries: entryMap.get(key) ?? 0,
    });
  }
  return out;
}

export type ActiveUsers = { dau: number; wau: number; mau: number; stickiness: number };

/**
 * Active users by session activity.
 *   DAU = distinct users with a session today (last 1 day)
 *   WAU = last 7 days, MAU = last 30 days
 *   stickiness = DAU/MAU (a standard engagement ratio)
 */
export async function getActiveUsers(): Promise<ActiveUsers> {
  async function distinctSince(days: number): Promise<number> {
    const [r] = await db
      .select({ c: countDistinct(userSessions.userId) })
      .from(userSessions)
      .where(gte(userSessions.startedAt, daysAgo(days)));
    return r.c;
  }
  const [dau, wau, mau] = await Promise.all([
    distinctSince(1),
    distinctSince(7),
    distinctSince(30),
  ]);
  return {
    dau,
    wau,
    mau,
    stickiness: mau ? +((dau / mau) * 100).toFixed(1) : 0,
  };
}

export type LeaderRow = { userId: string; name: string; entries: number };

/** Top creators — which users generate the most data. */
export async function getTopCreators(limit = 5): Promise<LeaderRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      name: sql<string>`coalesce(${users.name}, ${users.email})`,
      entries: count(dreamEntries.id),
    })
    .from(users)
    .leftJoin(dreamEntries, sql`${dreamEntries.userId} = ${users.id}`)
    .groupBy(users.id, users.name, users.email)
    .orderBy(sql`count(${dreamEntries.id}) desc`)
    .limit(limit);
  return rows.map((r) => ({ ...r, entries: Number(r.entries) }));
}

export type MoodSlice = { mood: string; count: number };

/** Distribution of entries by mood — a content-mix breakdown. */
export async function getMoodBreakdown(): Promise<MoodSlice[]> {
  const rows = await db
    .select({
      mood: sql<string>`coalesce(${dreamEntries.mood}, 'neutral')`,
      count: count(),
    })
    .from(dreamEntries)
    .groupBy(sql`1`)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({ mood: r.mood, count: Number(r.count) }));
}

export type DashboardData = {
  totals: Totals;
  daily: DailyPoint[];
  active: ActiveUsers;
  topCreators: LeaderRow[];
  moods: MoodSlice[];
};

/** One call to load everything the dashboard renders. */
export async function getDashboardData(): Promise<DashboardData> {
  const [totals, daily, active, topCreators, moods] = await Promise.all([
    getTotals(),
    getDailySeries(30),
    getActiveUsers(),
    getTopCreators(5),
    getMoodBreakdown(),
  ]);
  return { totals, daily, active, topCreators, moods };
}
