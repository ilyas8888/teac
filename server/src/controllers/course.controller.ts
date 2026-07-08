import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const courseSchema = z.object({
  nom: z.string().min(1),
  matiere: z.string().min(1),
  description: z.string().optional().nullable(),
  niveau: z.string().optional().nullable(),
  objectifsGeneraux: z.string().optional().nullable(),
  prerequis: z.string().optional().nullable(),
  nbHeures: z.number().int().positive().optional().nullable(),
  publicCible: z.string().optional().nullable(),
  couleur: z.string().optional().nullable(),
  image: z.string().url().optional().nullable(),
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
    include: {
      modules: { orderBy: { ordre: 'asc' } },
      sessions: { orderBy: { date: 'asc' } },
      evaluations: true,
    },
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
  const courseId = req.params.id;
  const course = await prisma.course.findFirst({ where: { id: courseId, teacherId } });
  if (!course) { res.status(404).json({ message: 'Cours non trouvé' }); return; }

  // Cascade through sessions (resources + absences) and evaluations (grades)
  const sessions = await prisma.session.findMany({ where: { courseId }, select: { id: true } });
  const sessionIds = sessions.map((s) => s.id);
  if (sessionIds.length) {
    await prisma.resource.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.absence.updateMany({ where: { sessionId: { in: sessionIds } }, data: { sessionId: null } });
    await prisma.session.deleteMany({ where: { courseId } });
  }

  const evaluationLinks = await prisma.evaluationCourse.findMany({ where: { courseId }, select: { evaluationId: true } });
  const evaluationIds = evaluationLinks.map((link) => link.evaluationId);
  if (evaluationIds.length) {
    await prisma.grade.deleteMany({ where: { evaluationId: { in: evaluationIds } } });
    await prisma.evaluation.deleteMany({ where: { id: { in: evaluationIds } } });
  }

  await prisma.course.delete({ where: { id: courseId } });
  res.json({ message: 'Cours supprimé' });
};
