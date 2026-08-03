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

export const scheduleItems = sqliteTable(
  "schedule_items",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    kind: text("kind", { enum: ["task", "project"] }).notNull(),
    title: text("title").notNull(),
    note: text("note").notNull().default(""),
    priority: text("priority", {
      enum: ["important", "normal", "later"],
    })
      .notNull()
      .default("normal"),
    repeatDaily: integer("repeat_daily", { mode: "boolean" })
      .notNull()
      .default(false),
    startDate: text("start_date").notNull(),
    dueDate: text("due_date"),
    progress: integer("progress").notNull().default(0),
    status: text("status", {
      enum: ["active", "completed", "archived"],
    })
      .notNull()
      .default("active"),
    completedDate: text("completed_date"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_schedule_items_user_status").on(table.userId, table.status),
    index("idx_schedule_items_user_kind").on(table.userId, table.kind),
  ],
);

export const scheduleEntries = sqliteTable(
  "schedule_entries",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => scheduleItems.id),
    userId: text("user_id").notNull(),
    entryDate: text("entry_date").notNull(),
    action: text("action", { enum: ["completed", "touched"] }).notNull(),
    progress: integer("progress"),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_schedule_entries_item_date").on(
      table.itemId,
      table.entryDate,
    ),
    index("idx_schedule_entries_user_date").on(table.userId, table.entryDate),
  ],
);
