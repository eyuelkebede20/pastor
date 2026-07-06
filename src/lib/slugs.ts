import { customAlphabet } from "nanoid";

// Lowercase + digits keeps slugs easy to read aloud and type.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";

export const newSlug = customAlphabet(alphabet, 7);

// Public card id for /c/[id] — a bit longer and less guessable.
const cardAlphabet =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const newCardId = customAlphabet(cardAlphabet, 10);
