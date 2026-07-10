import type { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma.service';
import type { AuthRequest } from '../middleware/auth.middleware';

const settingsSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  ecole: z.string().optional(),
  matieres: z.array(z.string()).optional(),
  niveauxOptions: z.array(z.string()).optional(),
  groupesOptions: z.array(z.string()).optional(),
  etablissementsOptions: z.array(z.string()).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId as string },
    select: {
      nom: true,
      prenom: true,
      email: true,
      ecole: true,
      matieres: true,
      niveauxOptions: true,
      groupesOptions: true,
      etablissementsOptions: true,
    },
  });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  res.json(user);
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const user = await prisma.user.update({
    where: { id: req.userId as string },
    data: parsed.data,
    select: {
      nom: true,
      prenom: true,
      email: true,
      ecole: true,
      matieres: true,
      niveauxOptions: true,
      groupesOptions: true,
      etablissementsOptions: true,
    },
  });
  res.json(user);
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: req.userId as string },
    select: { passwordHash: true },
  });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ message: 'Mot de passe actuel incorrect' }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.userId as string },
    data: { passwordHash },
  });
  res.json({ message: 'Mot de passe mis à jour' });
};
