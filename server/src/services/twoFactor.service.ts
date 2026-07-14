import { generateSecret as otpGenerateSecret, generateURI, verify as otpVerify } from 'otplib';
import QRCode from 'qrcode';
import { generateRawToken, hashToken } from '../lib/tokens';

const ISSUER = 'Teac';

/** Fresh base32 TOTP secret. */
export function generateSecret(): string {
  return otpGenerateSecret();
}

/** otpauth:// URI to feed into an authenticator app. */
export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: email, secret });
}

/** Render an otpauth URI as a data-URL PNG for display. */
export async function buildQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

/** Verify a 6-digit TOTP code against a secret (±30s tolerance for clock drift). */
export async function verifyTotp(code: string, secret: string): Promise<boolean> {
  try {
    const result = await otpVerify({ secret, token: code.trim(), epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}

/** Generate N single-use recovery codes; returns the plaintext codes + their hashes to store. */
export function generateRecoveryCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 10 hex chars, grouped as xxxxx-xxxxx for readability.
    const raw = generateRawToken(8).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase();
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    plain.push(formatted);
    hashes.push(hashToken(formatted));
  }
  return { plain, hashes };
}

/** Normalise a recovery code for hashing (tolerate spaces/case). */
export function hashRecoveryCode(input: string): string {
  return hashToken(input.trim().toLowerCase());
}
