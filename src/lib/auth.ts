import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

const defaultAuthSecret =
  "opensd23r23f2@#$#@Fsdafasdfs#@#$#F#@FDFDF#fef233[['[.[l[l[[[]]]]]]']";
const defaultAuthUrl = "https://pastor.senaycreatives.com";

let rawAuthUrl = process.env.BETTER_AUTH_URL;
if (!rawAuthUrl || rawAuthUrl.includes("localhost")) {
  rawAuthUrl = process.env.NODE_ENV === "production" ? defaultAuthUrl : "http://localhost:3000";
}
// Strip any trailing slashes from baseURL
const baseURL = rawAuthUrl.replace(/\/+$/, "");

const secret = process.env.BETTER_AUTH_SECRET || defaultAuthSecret;

export const auth = betterAuth({
  appName: "Pastor",
  baseURL,
  secret,
  trustedOrigins: [
    "https://pastor.senaycreatives.com",
    "https://pastor.senaycreatives.com/",
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
