import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  generateSecret, buildOtpAuthUrl, buildQrDataUrl, verifyTotp, generateRecoveryCodes,
} from '../services/twoFactor.service';

const codeSchema = z.object({ code: z.string().min(6).max(10) });

/** Start enrolment: mint a secret (not yet enabled) and return a QR to scan. */
export const setup2fa = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  if (user.twoFactorEnabled) { res.status(400).json({ message: 'La double authentification est déjà activée.' }); return; }

  const secret = generateSecret();
  // Store the pending secret; it only becomes usable once /enable confirms a code.
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qr = await buildQrDataUrl(otpauthUrl);
  res.json({ secret, otpauthUrl, qr });
};

/** Confirm enrolment: verify a code, flip the flag on, and return one-time recovery codes. */
export const enable2fa = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Code invalide' }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !user.twoFactorSecret) { res.status(400).json({ message: 'Aucune configuration 2FA en cours.' }); return; }
  if (user.twoFactorEnabled) { res.status(400).json({ message: 'Déjà activée.' }); return; }
  if (!(await verifyTotp(parsed.data.code, user.twoFactorSecret))) {
    res.status(400).json({ message: 'Code incorrect.' });
    return;
  }

  const { plain, hashes } = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorRecovery: hashes },
  });
  res.json({ message: 'Double authentification activée.', recoveryCodes: plain });
};

const disableSchema = z.object({ password: z.string().min(1) });

/** Turn off 2FA — requires the account password as a re-auth step. */
export const disable2fa = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = disableSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Mot de passe requis' }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ message: 'Mot de passe incorrect.' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecovery: [] },
  });
  res.json({ message: 'Double authentification désactivée.' });
};
