import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const evalSchema = z.object({
  titre: z.string().min(1),
  bareme: z.number().positive(),
  date: z.string(),
  courseId: z.string().uuid(),
});

export const getEvaluations = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const courseId = req.query.courseId as string | undefined;
  const evals = await prisma.evaluation.findMany({
    where: {
      courseId: courseId || undefined,
      course: { teacherId },
    },
    include: { course: { select: { nom: true } }, _count: { select: { grades: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(evals);
};

export const getEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const ev = await prisma.evaluation.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    include: { grades: { include: { student: true } } },
  });
  if (!ev) { res.status(404).json({ message: 'Évaluation non trouvée' }); return; }
  res.json(ev);
};

export const createEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = evalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const ev = await prisma.evaluation.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  res.status(201).json(ev);
};

export const updateEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = evalSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { date, ...rest } = parsed.data;
  await prisma.evaluation.update({
    where: { id: req.params.id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });
  res.json({ message: 'Évaluation mise à jour' });
};

export const deleteEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.evaluation.delete({ where: { id: req.params.id } });
  res.json({ message: 'Évaluation supprimée' });
};
