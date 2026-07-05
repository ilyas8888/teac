import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const obsSchema = z.object({
  contenu: z.string().min(1),
  studentId: z.string().uuid(),
});

export const getObservations = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const studentId = req.params.studentId;
  const observations = await prisma.observation.findMany({
    where: { studentId, teacherId },
    orderBy: { date: 'desc' },
  });
  res.json(observations);
};

export const createObservation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = obsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const obs = await prisma.observation.create({ data: { ...parsed.data, teacherId } });
  res.status(201).json(obs);
};

export const deleteObservation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  await prisma.observation.deleteMany({ where: { id: req.params.id, teacherId } });
  res.json({ message: 'Observation supprimée' });
};
