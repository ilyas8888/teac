import { randomBytes, createHash } from 'crypto';

/** Cryptographically-strong, URL-safe opaque token (raw value, shown once). */
export function generateRawToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Deterministic hash stored in DB — the raw token is never persisted. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Numeric one-time code (e.g. email OTP), left-padded to `digits`. */
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return String(randomBytes(4).readUInt32BE(0) % max).padStart(digits, '0');
}
