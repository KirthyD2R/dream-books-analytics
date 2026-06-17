import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Shared postgres connection + Drizzle instance, created lazily.
 *
 * Lazy so that simply importing this module (e.g. during `next build`'s route
 * analysis) doesn't require DATABASE_URL — it's only needed when a query runs.
 * The connection is cached on globalThis so dev hot-reloads reuse it instead of
 * opening a new pool each time.
 */
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const client = postgres(connectionString, { max: 5 });
  return drizzle(client, { schema });
}

/**
 * Lazy proxy: behaves exactly like the Drizzle instance, but the real
 * connection isn't opened until the first property access (i.e. first query).
 */
export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop, receiver) {
      const instance = (globalForDb.db ??= createDb());
      const value = Reflect.get(instance as object, prop, receiver);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  },
);

export { schema };
