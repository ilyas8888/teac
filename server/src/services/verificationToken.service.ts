import { VerificationType } from '@prisma/client';
import prisma from './prisma.service';
import { generateRawToken, hashToken } from '../lib/tokens';

const TTL_MS: Record<VerificationType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000, // 24h
  PASSWORD_RESET: 60 * 60 * 1000, // 1h
};

/** Create a one-time token of a given type; invalidates prior unconsumed tokens of that type. */
export async function createVerificationToken(userId: string, type: VerificationType): Promise<string> {
  const raw = generateRawToken();
  await prisma.verificationToken.updateMany({
    where: { userId, type, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TTL_MS[type]),
    },
  });
  return raw;
}

/** Validate + consume a token. Returns the userId on success, null if invalid/expired/used. */
export async function consumeVerificationToken(raw: string, type: VerificationType): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const token = await prisma.verificationToken.findUnique({ where: { tokenHash } });
  if (!token || token.type !== type || token.consumedAt || token.expiresAt < new Date()) {
    return null;
  }
  await prisma.verificationToken.update({
    where: { tokenHash },
    data: { consumedAt: new Date() },
  });
  return token.userId;
}
