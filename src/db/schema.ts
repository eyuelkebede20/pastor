import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ── better-auth core tables ──────────────────────────────────────────────
// JS keys mirror better-auth's model field names (camelCase); DB columns are
// snake_case. Keep these in sync with better-auth if it is upgraded.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── app tables ────────────────────────────────────────────────────────────

// profiles: 1-to-1 with better-auth user
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 30 }).notNull().unique(), // ^[a-z0-9_]{3,30}$
  displayName: varchar("display_name", { length: 60 }).notNull(),
  bio: varchar("bio", { length: 160 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// links: the linktree entries
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 80 }).notNull(),
    url: text("url").notNull(), // validated https?:// via zod
    position: integer("position").notNull(), // manual ordering, 0-based
    isActive: boolean("is_active").default(true).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    // the auto-created short link that public buttons route through
    shortSlug: varchar("short_slug", { length: 12 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("links_user_idx").on(t.userId)],
);

// short_links: sharable short URLs (profile pages AND arbitrary URLs)
export const shortLinks = pgTable("short_links", {
  slug: varchar("slug", { length: 12 }).primaryKey(), // nanoid(7)
  targetUrl: text("target_url").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // nullable → anonymous allowed
  ownerIp: varchar("owner_ip", { length: 64 }), // for anonymous rate limiting
  clicks: integer("clicks").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── vCards feature ──────────────────────────────────────────────────────────
// companies: a group / order owned by a user (e.g. one client per company)
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("companies_user_idx").on(t.userId)],
);

// card_fields: the columns/fields defined per company
export const cardFields = pgTable(
  "card_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 40 }).notNull(),
    type: varchar("type", { length: 24 }).notNull(), // registry key or 'custom'
    icon: varchar("icon", { length: 16 }), // emoji, used when type = 'custom'
    position: integer("position").notNull(),
  },
  (t) => [index("card_fields_company_idx").on(t.companyId)],
);

// cards: one person (a row), rendered as a public virtual ID at /c/[publicId]
export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    publicId: varchar("public_id", { length: 16 }).notNull().unique(), // nanoid
    fullName: varchar("full_name", { length: 80 }).notNull(),
    title: varchar("title", { length: 80 }),
    // fieldId -> value
    values: jsonb("values")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("cards_company_idx").on(t.companyId)],
);
