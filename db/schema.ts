import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    onboardingVersion: integer("onboarding_version").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [uniqueIndex("idx_users_email").on(table.email)],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_auth_sessions_user").on(table.userId)],
);

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
    parentItemId: text("parent_item_id"),
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
    index("idx_schedule_items_parent_status").on(table.parentItemId, table.status),
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
    previousProgress: integer("previous_progress"),
    progress: integer("progress"),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_schedule_entries_item_date").on(table.itemId, table.entryDate),
    index("idx_schedule_entries_user_date").on(table.userId, table.entryDate),
  ],
);

export const scheduleParticipants = sqliteTable(
  "schedule_participants",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => scheduleItems.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_schedule_participants_item_username").on(
      table.itemId,
      table.username,
    ),
    index("idx_schedule_participants_username").on(table.username),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientUsername: text("recipient_username").notNull(),
    actorUsername: text("actor_username"),
    itemId: text("item_id").references(() => scheduleItems.id, {
      onDelete: "set null",
    }),
    kind: text("kind", {
      enum: ["today_pending", "shared", "progress", "changed", "removed", "tool_inactive"],
    }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    uniqueKey: text("unique_key"),
    readAt: text("read_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_notifications_recipient_created").on(
      table.recipientUsername,
      table.createdAt,
    ),
    index("idx_notifications_recipient_read").on(
      table.recipientUsername,
      table.readAt,
    ),
    uniqueIndex("idx_notifications_unique_key").on(table.uniqueKey),
  ],
);

export const dailyPhraseStates = sqliteTable(
  "daily_phrase_states",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    phraseDate: text("phrase_date").notNull(),
    phraseId: text("phrase_id").notNull(),
    swapCount: integer("swap_count").notNull().default(0),
    learnedAt: text("learned_at"),
    favoriteAt: text("favorite_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_daily_phrase_states_user_date").on(table.userId, table.phraseDate),
    index("idx_daily_phrase_states_user_favorite").on(table.userId, table.favoriteAt),
  ],
);

export const portalLinks = sqliteTable(
  "portal_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category", { enum: ["life", "entertainment"] }).notNull(),
    label: text("label").notNull(),
    url: text("url").notNull(),
    icon: text("icon").notNull(),
    color: text("color").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    defaultKey: text("default_key"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_portal_links_user_category_order").on(
      table.userId,
      table.category,
      table.sortOrder,
    ),
    uniqueIndex("idx_portal_links_user_default_key").on(
      table.userId,
      table.defaultKey,
    ),
  ],
);

export const toolUsage = sqliteTable(
  "tool_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    toolKey: text("tool_key", {
      enum: ["habit", "schedule", "pindou", "favorites", "meal"],
    }).notNull(),
    openCount: integer("open_count").notNull().default(0),
    firstSeenAt: text("first_seen_at").notNull(),
    lastOpenedAt: text("last_opened_at"),
    isFolded: integer("is_folded", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_tool_usage_user_tool").on(table.userId, table.toolKey),
  ],
);

export const mealRecipes = sqliteTable(
  "meal_recipes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    category: text("category", {
      enum: ["meat", "vegetable", "staple", "soup", "other"],
    })
      .notNull()
      .default("other"),
    imageData: text("image_data"),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_meal_recipes_active_category").on(table.isActive, table.category),
  ],
);

export const mealSelections = sqliteTable(
  "meal_selections",
  {
    id: text("id").primaryKey(),
    recipeId: text("recipe_id")
      .notNull()
      .references(() => mealRecipes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mealDate: text("meal_date").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_meal_selections_recipe_user_date").on(
      table.recipeId,
      table.userId,
      table.mealDate,
    ),
    index("idx_meal_selections_date").on(table.mealDate),
    index("idx_meal_selections_user_date").on(table.userId, table.mealDate),
  ],
);
