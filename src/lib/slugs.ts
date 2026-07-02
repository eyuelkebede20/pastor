import { customAlphabet } from "nanoid";

// Lowercase + digits keeps slugs easy to read aloud and type.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

export const newSlug = customAlphabet(alphabet, 7);
