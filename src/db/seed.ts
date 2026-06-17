import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { users, dreamBooks, dreamEntries, userSessions } from "./schema";

/**
 * Seeds the database with realistic demo data so the dashboard is meaningful
 * before real Dream Books data is wired in. Safe to run repeatedly — it wipes
 * the seeded tables first. DO NOT run against production.
 *
 *   npm run db:seed
 */

const MOODS = ["happy", "sad", "anxious", "peaceful", "scared", "excited", "neutral"] as const;
const FIRST = ["Ava", "Liam", "Noah", "Mia", "Zoe", "Kai", "Ivy", "Leo", "Nora", "Eli", "Ruby", "Max"];
const TITLES = [
  "Flying over the city",
  "Lost in a library",
  "The endless staircase",
  "Talking to a stranger",
  "Back in school",
  "Ocean of stars",
  "Chasing a train",
  "A house that breathes",
];

function rand(n: number) {
  return Math.floor(Math.random() * n);
}
function pick<T>(arr: readonly T[]): T {
  return arr[rand(arr.length)];
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rand(24), rand(60), 0, 0);
  return d;
}

async function main() {
  console.log("Clearing seeded tables…");
  await db.delete(userSessions);
  await db.delete(dreamEntries);
  await db.delete(dreamBooks);
  await db.delete(users);

  const USER_COUNT = 60;
  console.log(`Inserting ${USER_COUNT} users…`);

  for (let i = 0; i < USER_COUNT; i++) {
    const name = `${pick(FIRST)} ${String.fromCharCode(65 + rand(26))}.`;
    // Spread signups across the last 60 days.
    const signupDaysAgo = rand(60);
    const [user] = await db
      .insert(users)
      .values({
        email: `user${i}-${Date.now() % 100000}@example.com`,
        name,
        createdAt: daysAgo(signupDaysAgo),
      })
      .returning();

    // Each user gets 1–3 books.
    const bookCount = 1 + rand(3);
    const bookIds: string[] = [];
    for (let b = 0; b < bookCount; b++) {
      const [book] = await db
        .insert(dreamBooks)
        .values({
          userId: user.id,
          title: `${name.split(" ")[0]}'s Dream Journal ${b + 1}`,
          createdAt: daysAgo(rand(signupDaysAgo + 1)),
        })
        .returning();
      bookIds.push(book.id);
    }

    // Each user creates 0–25 entries since signing up.
    const entryCount = rand(26);
    let lastActive: Date | null = null;
    for (let e = 0; e < entryCount; e++) {
      const when = daysAgo(rand(signupDaysAgo + 1));
      if (!lastActive || when > lastActive) lastActive = when;
      await db.insert(dreamEntries).values({
        bookId: pick(bookIds),
        userId: user.id,
        title: pick(TITLES),
        content: "Last night I dreamt about something vivid and strange…",
        mood: pick(MOODS),
        wordCount: 30 + rand(400),
        createdAt: when,
      });
    }

    // Sessions drive DAU/WAU/MAU — recent activity within the last ~35 days.
    const sessionCount = rand(15);
    for (let s = 0; s < sessionCount; s++) {
      await db.insert(userSessions).values({
        userId: user.id,
        startedAt: daysAgo(rand(Math.min(signupDaysAgo + 1, 35))),
      });
    }

    if (lastActive) {
      await db.update(users).set({ lastActiveAt: lastActive }).where(eq(users.id, user.id));
    }
  }

  console.log("Seed complete ✅");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
