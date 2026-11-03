import crypto from "crypto";

/**
 * Opaque record id — 16-char hex. Generated in app code and passed explicitly on
 * `prisma.*.create`, so ids keep the same format they had under the old JSON store
 * (and stay stable across the data import).
 */
export function newId(): string {
  return crypto.randomBytes(8).toString("hex");
}
