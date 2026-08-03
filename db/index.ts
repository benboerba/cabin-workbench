import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

type DatabaseHandle = BetterSQLite3Database<typeof schema>;

const globalDatabase = globalThis as typeof globalThis & {
  cabinDatabase?: DatabaseHandle;
};

export function getDb() {
  if (globalDatabase.cabinDatabase) return globalDatabase.cabinDatabase;

  const databasePath = path.resolve(
    process.env.DATABASE_PATH ?? path.join(process.cwd(), ".data", "oneminute.db"),
  );
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const database = drizzle(sqlite, { schema });
  migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  globalDatabase.cabinDatabase = database;

  return database;
}
