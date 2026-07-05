import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const courseSchema = z.object({
  nom: z.string().min(1),
  matiere: z.string().min(1),
  description: z.string().optional(),
});

export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const courses = await prisma.course.findMany({
    where: { teacherId },
    include: { _count: { select: { sessions: true, evaluations: true } } },
    orderBy: { nom: 'asc' },
  });
  res.json(courses);
};

export const getCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const course = await prisma.course.findFirst({
    where: { id: req.params.id, teacherId },
    include: { sessions: { orderBy: { date: 'asc' } }, evaluations: true },
  });
  if (!course) { res.status(404).json({ message: 'Cours non trouvé' }); return; }
  res.json(course);
};

export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const course = await prisma.course.create({ data: { ...parsed.data, teacherId } });
  res.status(201).json(course);
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  await prisma.course.updateMany({ where: { id: req.params.id, teacherId }, data: parsed.data });
  res.json({ message: 'Cours mis à jour' });
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  await prisma.course.deleteMany({ where: { id: req.params.id, teacherId } });
  res.json({ message: 'Cours supprimé' });
};
