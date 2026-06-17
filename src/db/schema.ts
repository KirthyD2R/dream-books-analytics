import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  pgEnum,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Dream Books schema.
 *
 * This is the canonical data model the analytics dashboard reads from.
 * It is intentionally small and will grow sprint by sprint — when you add
 * a table or column, keep a `createdAt` (and `updatedAt` where it makes
 * sense) so the volume/activity queries in src/db/analytics.ts keep working.
 */

export const moodEnum = pgEnum("mood", [
  "happy",
  "sad",
  "anxious",
  "peaceful",
  "scared",
  "excited",
  "neutral",
]);

/** A person who uses Dream Books. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Bumped whenever the user does something meaningful (create entry, login).
    // Drives DAU/WAU/MAU "active user" metrics.
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  },
  (t) => ({
    createdAtIdx: index("users_created_at_idx").on(t.createdAt),
    lastActiveAtIdx: index("users_last_active_at_idx").on(t.lastActiveAt),
  }),
);

/** A journal/collection owned by a user that holds dream entries. */
export const dreamBooks = pgTable(
  "dream_books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("dream_books_user_id_idx").on(t.userId),
    createdAtIdx: index("dream_books_created_at_idx").on(t.createdAt),
  }),
);

/** A single recorded dream — the core unit of "data users create". */
export const dreamEntries = pgTable(
  "dream_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => dreamBooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    mood: moodEnum("mood").default("neutral"),
    // Rough length signal for "richness" of entries without scanning content.
    wordCount: integer("word_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("dream_entries_user_id_idx").on(t.userId),
    bookIdIdx: index("dream_entries_book_id_idx").on(t.bookId),
    createdAtIdx: index("dream_entries_created_at_idx").on(t.createdAt),
  }),
);

/** Free-form labels users attach to entries. */
export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Many-to-many join between entries and tags. */
export const dreamEntryTags = pgTable(
  "dream_entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => dreamEntries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.entryId, t.tagId] }),
  }),
);

/** Login/usage sessions — the source of truth for engagement & retention. */
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => ({
    userIdIdx: index("user_sessions_user_id_idx").on(t.userId),
    startedAtIdx: index("user_sessions_started_at_idx").on(t.startedAt),
  }),
);

// ---- Relations (used by Drizzle's relational query API) ----

export const usersRelations = relations(users, ({ many }) => ({
  books: many(dreamBooks),
  entries: many(dreamEntries),
  sessions: many(userSessions),
}));

export const dreamBooksRelations = relations(dreamBooks, ({ one, many }) => ({
  user: one(users, { fields: [dreamBooks.userId], references: [users.id] }),
  entries: many(dreamEntries),
}));

export const dreamEntriesRelations = relations(dreamEntries, ({ one, many }) => ({
  user: one(users, { fields: [dreamEntries.userId], references: [users.id] }),
  book: one(dreamBooks, { fields: [dreamEntries.bookId], references: [dreamBooks.id] }),
  entryTags: many(dreamEntryTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  entryTags: many(dreamEntryTags),
}));

export const dreamEntryTagsRelations = relations(dreamEntryTags, ({ one }) => ({
  entry: one(dreamEntries, {
    fields: [dreamEntryTags.entryId],
    references: [dreamEntries.id],
  }),
  tag: one(tags, { fields: [dreamEntryTags.tagId], references: [tags.id] }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, { fields: [userSessions.userId], references: [users.id] }),
}));
