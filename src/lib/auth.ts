import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

const defaultAuthSecret =
  "opensd23r23f2@#$#@Fsdafasdfs#@#$#F#@FDFDF#fef233[['[.[l[l[[[]]]]]]']";
const defaultAuthUrl = "https://pastor.senaycreatives.com";

const baseURL =
  process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes("localhost")
    ? process.env.BETTER_AUTH_URL
    : process.env.NODE_ENV === "production"
      ? defaultAuthUrl
      : process.env.BETTER_AUTH_URL || "http://localhost:3000";

const secret = process.env.BETTER_AUTH_SECRET || defaultAuthSecret;

export const auth = betterAuth({
  appName: "Pastor",
  baseURL,
  secret,
  trustedOrigins: [
    "https://pastor.senaycreatives.com",
    "http://pastor.senaycreatives.com",
    "http://localhost:3000",
  ],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  },
});
