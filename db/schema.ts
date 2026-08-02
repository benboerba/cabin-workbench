import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const challenges = sqliteTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    status: text("status", {
      enum: ["active", "completed", "archived"],
    })
      .notNull()
      .default("active"),
    createdDate: text("created_date").notNull(),
    endedDate: text("ended_date"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_challenges_user_status").on(table.userId, table.status),
  ],
);

export const checkins = sqliteTable(
  "checkins",
  {
    id: text("id").primaryKey(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id),
    userId: text("user_id").notNull(),
    habitDate: text("habit_date").notNull(),
    note: text("note").notNull().default(""),
    timerStartedAt: text("timer_started_at").notNull(),
    completedAt: text("completed_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_checkins_challenge_date").on(
      table.challengeId,
      table.habitDate,
    ),
    index("idx_checkins_user_date").on(table.userId, table.habitDate),
  ],
);

export const timerSessions = sqliteTable(
  "timer_sessions",
  {
    id: text("id").primaryKey(),
    challengeId: text("challenge_id")
      .notNull()
      .references(() => challenges.id),
    userId: text("user_id").notNull(),
    habitDate: text("habit_date").notNull(),
    status: text("status", {
      enum: ["running", "paused", "completed", "expired"],
    })
      .notNull()
      .default("running"),
    startedAt: text("started_at").notNull(),
    remainingMs: integer("remaining_ms").notNull().default(60000),
    pauseUsed: integer("pause_used", { mode: "boolean" })
      .notNull()
      .default(false),
    pausedAt: text("paused_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_timer_sessions_challenge_status").on(
      table.challengeId,
      table.status,
    ),
    index("idx_timer_sessions_user_status").on(table.userId, table.status),
  ],
);
