import type { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import type { AuthRequest } from '../middleware/auth.middleware';

const settingsSchema = z.object({
  niveauxOptions: z.array(z.string()).optional(),
  groupesOptions: z.array(z.string()).optional(),
  etablissementsOptions: z.array(z.string()).optional(),
});

export const getSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId as string },
    select: { niveauxOptions: true, groupesOptions: true, etablissementsOptions: true },
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
    select: { niveauxOptions: true, groupesOptions: true, etablissementsOptions: true },
  });
  res.json(user);
};
