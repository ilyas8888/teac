import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const sessionSchema = z.object({
  titre: z.string().min(1),
  objectifs: z.string().min(1),
  contenu: z.string().optional(),
  duree: z.number().int().positive(),
  date: z.string(),
  courseId: z.string().uuid(),
  classId: z.string().uuid(),
});

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const courseId = req.query.courseId as string | undefined;
  const classId = req.query.classId as string | undefined;
  const sessions = await prisma.session.findMany({
    where: {
      courseId: courseId || undefined,
      classId: classId || undefined,
      course: { teacherId },
    },
    include: { course: { select: { nom: true } }, class: { select: { nom: true } }, _count: { select: { resources: true } } },
    orderBy: { date: 'asc' },
  });
  res.json(sessions);
};

export const getSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    include: { course: true, class: true, resources: true },
  });
  if (!session) { res.status(404).json({ message: 'Séance non trouvée' }); return; }
  res.json(session);
};

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const session = await prisma.session.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  res.status(201).json(session);
};

export const updateSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = sessionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { date, ...rest } = parsed.data;
  await prisma.session.update({
    where: { id: req.params.id },
    data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
  });
  res.json({ message: 'Séance mise à jour' });
};

export const deleteSession = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.session.delete({ where: { id: req.params.id } });
  res.json({ message: 'Séance supprimée' });
};
