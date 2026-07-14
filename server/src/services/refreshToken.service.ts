import prisma from './prisma.service';
import { generateRawToken, hashToken } from '../lib/tokens';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Issue a fresh refresh token for a user; returns the raw value (store client-side). */
export async function issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
  const raw = generateRawToken();
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(raw),
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: userAgent?.slice(0, 255),
    },
  });
  return raw;
}

/**
 * Rotate a refresh token: revoke the presented one and issue a new one.
 * Reuse detection: if an already-revoked/expired token is presented, treat it as a
 * breach and revoke every active token of that user. Returns null when invalid.
 */
export async function rotateRefreshToken(
  raw: string,
  userAgent?: string,
): Promise<{ raw: string; userId: string } | null> {
  const tokenHash = hashToken(raw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return null;

  if (existing.revokedAt || existing.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  const newRaw = generateRawToken();
  const newHash = hashToken(newRaw);
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date(), replacedBy: newHash },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: existing.userId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        userAgent: userAgent?.slice(0, 255),
      },
    }),
  ]);
  return { raw: newRaw, userId: existing.userId };
}

/** Revoke a single refresh token (logout on this device). */
export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke every active refresh token for a user (password change, breach, logout-all). */
export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
