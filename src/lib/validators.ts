import { z } from "zod";

export const RESERVED_USERNAMES = new Set([
  "qr",
  "links",
  "login",
  "signup",
  "api",
  "u",
  "r",
  "c",
  "cards",
  "admin",
  "og",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_]{3,30}$/,
    "Use 3–30 lowercase letters, numbers, or underscores.",
  )
  .refine((v) => !RESERVED_USERNAMES.has(v), "That username is reserved.");

const httpUrl = z
  .string()
  .trim()
  .url("Enter a full URL.")
  .refine(
    (v) => /^https?:\/\//i.test(v),
    "Links must start with http:// or https://.",
  );

export const profileSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Add a display name.").max(60),
  bio: z.string().trim().max(160).optional().or(z.literal("")),
  avatarUrl: z
    .string()
    .trim()
    .url("Enter a valid image URL.")
    .optional()
    .or(z.literal("")),
});

export const linkSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(80),
  url: httpUrl,
});

export const shortenSchema = z.object({
  url: httpUrl.refine(
    (v) => !/\/r\/[A-Za-z0-9_-]+$/.test(v),
    "That's already a short link.",
  ),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Add your name.").max(60),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});
