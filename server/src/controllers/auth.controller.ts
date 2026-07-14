import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken, revokeAllForUser } from '../services/refreshToken.service';
import { createVerificationToken, consumeVerificationToken } from '../services/verificationToken.service';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';
import { verifyTotp, hashRecoveryCode } from '../services/twoFactor.service';

const ACCESS_TTL = '15m';
const PENDING_2FA_TTL = '5m';

function signPendingToken(userId: string): string {
  return jwt.sign({ userId, type: '2fa_pending' }, process.env.JWT_SECRET!, { expiresIn: PENDING_2FA_TTL });
}

const registerSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  ecole: z.string().optional(),
  matieres: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

function signAccessToken(userId: string): string {
  return jwt.sign({ userId, type: 'access' }, process.env.JWT_SECRET!, { expiresIn: ACCESS_TTL });
}

/** Mint an access token + a rotating refresh token for a freshly authenticated user. */
async function issueSession(userId: string, userAgent?: string): Promise<{ token: string; refreshToken: string }> {
  const token = signAccessToken(userId);
  const refreshToken = await issueRefreshToken(userId, userAgent);
  return { token, refreshToken };
}

const publicUser = (u: { id: string; nom: string; prenom: string; email: string; emailVerified: boolean; twoFactorEnabled: boolean }) => ({
  id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, emailVerified: u.emailVerified, twoFactorEnabled: u.twoFactorEnabled,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides', errors: parsed.error.flatten() });
    return;
  }
  const { nom, prenom, email, password, ecole, matieres } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email déjà utilisé' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      nom, prenom, email, passwordHash, ecole, matieres: matieres || [],
      niveauxOptions: ['Technicien Spécialisé', 'Technicien', 'Spécialisation', 'Qualification'],
      groupesOptions: ['Groupe 1', 'Groupe 2', 'Groupe 3', 'Groupe 4'],
      etablissementsOptions: ['ISTA Hay Riad', 'ISTA Sala Al Jadida', 'OFPPT'],
    },
  });
  // Fire off the verification email; a mail failure must not break signup.
  try {
    const rawToken = await createVerificationToken(user.id, 'EMAIL_VERIFY');
    await sendVerificationEmail(user.email, user.prenom, rawToken);
  } catch (err) {
    console.error('[auth] envoi email de vérification échoué:', err);
  }

  const session = await issueSession(user.id, req.headers['user-agent']);
  res.status(201).json({ ...session, user: publicUser(user) });
};

const verifyEmailSchema = z.object({ token: z.string().min(1) });

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Token manquant' }); return; }

  const userId = await consumeVerificationToken(parsed.data.token, 'EMAIL_VERIFY');
  if (!userId) { res.status(400).json({ message: 'Lien invalide ou expiré' }); return; }

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  res.json({ message: 'Email vérifié' });
};

export const resendVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  if (user.emailVerified) { res.json({ message: 'Email déjà vérifié' }); return; }

  try {
    const rawToken = await createVerificationToken(user.id, 'EMAIL_VERIFY');
    await sendVerificationEmail(user.email, user.prenom, rawToken);
  } catch (err) {
    console.error('[auth] renvoi email de vérification échoué:', err);
    res.status(502).json({ message: "Impossible d'envoyer l'email pour le moment." });
    return;
  }
  res.json({ message: 'Email de vérification renvoyé' });
};

const forgotSchema = z.object({ email: z.string().email() });

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = forgotSchema.safeParse(req.body);
  // Anti-enumeration: reply 200 no matter what, and never reveal whether the email exists.
  if (parsed.success) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      try {
        const rawToken = await createVerificationToken(user.id, 'PASSWORD_RESET');
        await sendPasswordResetEmail(user.email, user.prenom, rawToken);
      } catch (err) {
        console.error('[auth] envoi email de réinitialisation échoué:', err);
      }
    }
  }
  res.json({ message: 'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.' });
};

const resetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides', errors: parsed.error.flatten() });
    return;
  }
  const userId = await consumeVerificationToken(parsed.data.token, 'PASSWORD_RESET');
  if (!userId) { res.status(400).json({ message: 'Lien invalide ou expiré' }); return; }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  // Invalidate every existing session — a password reset must log out other devices.
  await revokeAllForUser(userId);
  res.json({ message: 'Mot de passe réinitialisé. Vous pouvez vous connecter.' });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides' });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    return;
  }
  // If 2FA is on, defer the session until a code is provided via /login/2fa.
  if (user.twoFactorEnabled) {
    res.json({ twoFactorRequired: true, pendingToken: signPendingToken(user.id) });
    return;
  }
  const session = await issueSession(user.id, req.headers['user-agent']);
  res.json({ ...session, user: publicUser(user) });
};

const login2faSchema = z.object({ pendingToken: z.string().min(1), code: z.string().min(6).max(11) });

export const loginTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const parsed = login2faSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  let userId: string;
  try {
    const decoded = jwt.verify(parsed.data.pendingToken, process.env.JWT_SECRET!) as { userId?: string; type?: string };
    if (decoded.type !== '2fa_pending' || !decoded.userId) throw new Error('bad token');
    userId = decoded.userId;
  } catch {
    res.status(401).json({ message: 'Session expirée, reconnectez-vous.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ message: 'Double authentification non configurée.' });
    return;
  }

  const code = parsed.data.code.trim();
  let ok = await verifyTotp(code, user.twoFactorSecret);
  // Fall back to single-use recovery codes.
  if (!ok) {
    const codeHash = hashRecoveryCode(code);
    if (user.twoFactorRecovery.includes(codeHash)) {
      ok = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorRecovery: user.twoFactorRecovery.filter((h) => h !== codeHash) },
      });
    }
  }
  if (!ok) { res.status(401).json({ message: 'Code incorrect.' }); return; }

  const session = await issueSession(user.id, req.headers['user-agent']);
  res.json({ ...session, user: publicUser(user) });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Refresh token manquant' });
    return;
  }
  const rotated = await rotateRefreshToken(parsed.data.refreshToken, req.headers['user-agent']);
  if (!rotated) {
    res.status(401).json({ message: 'Session expirée, reconnectez-vous.' });
    return;
  }
  res.json({ token: signAccessToken(rotated.userId), refreshToken: rotated.raw });
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) await revokeRefreshToken(parsed.data.refreshToken);
  res.status(204).end();
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, nom: true, prenom: true, email: true, ecole: true, matieres: true, emailVerified: true, twoFactorEnabled: true },
  });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  res.json(user);
};
