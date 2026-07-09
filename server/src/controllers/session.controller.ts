import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const sessionSchema = z.object({
  titre: z.string().min(1),
  objectifs: z.string().min(1),
  contenu: z.string().optional(),
  content: z.any().optional(),
  image: z.string().url().optional().nullable(),
  duree: z.number().int().positive(),
  date: z.string(),
  courseId: z.string().min(1),
  classId: z.string().min(1),
  moduleId: z.string().min(1).optional().nullable(),
});

const ensureSessionRelations = async (
  data: Partial<z.infer<typeof sessionSchema>>,
  teacherId: string,
  currentCourseId?: string,
): Promise<{ ok: true; courseId: string } | { ok: false; status: number; message: string }> => {
  const courseId = data.courseId ?? currentCourseId;
  if (!courseId) return { ok: false, status: 400, message: 'Cours manquant' };

  if (data.courseId) {
    const course = await prisma.course.findFirst({ where: { id: data.courseId, teacherId }, select: { id: true } });
    if (!course) return { ok: false, status: 404, message: 'Cours non trouvé' };
  }

  if (data.classId) {
    const cls = await prisma.class.findFirst({ where: { id: data.classId, teacherId }, select: { id: true } });
    if (!cls) return { ok: false, status: 404, message: 'Classe non trouvée' };
  }

  if (data.moduleId) {
    const module = await prisma.module.findFirst({
      where: { id: data.moduleId, course: { teacherId } },
      select: { courseId: true },
    });
    if (!module) return { ok: false, status: 404, message: 'Module non trouvé' };
    if (module.courseId !== courseId) {
      return { ok: false, status: 400, message: 'Le module ne correspond pas au cours de la séance' };
    }
  }

  return { ok: true, courseId };
};

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
  const teacherId = req.userId as string;
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const relations = await ensureSessionRelations(parsed.data, teacherId);
  if (!relations.ok) { res.status(relations.status).json({ message: relations.message }); return; }

  const session = await prisma.session.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  res.status(201).json(session);
};

export const updateSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = sessionSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const existing = await prisma.session.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    select: { id: true, courseId: true, moduleId: true },
  });
  if (!existing) { res.status(404).json({ message: 'Séance non trouvée' }); return; }

  const relations = await ensureSessionRelations(parsed.data, teacherId, existing.courseId);
  if (!relations.ok) { res.status(relations.status).json({ message: relations.message }); return; }

  const { date, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...(date ? { date: new Date(date) } : {}),
    ...(rest.courseId && rest.courseId !== existing.courseId && rest.moduleId === undefined ? { moduleId: null } : {}),
  };

  await prisma.session.update({
    where: { id: req.params.id },
    data,
  });
  res.json({ message: 'Séance mise à jour' });
};

export const deleteSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const sessionId = req.params.id;
  const session = await prisma.session.findFirst({ where: { id: sessionId, course: { teacherId } } });
  if (!session) { res.status(404).json({ message: 'Séance non trouvée' }); return; }
  // Cascade: remove resources, detach absences (keep attendance records)
  await prisma.resource.deleteMany({ where: { sessionId } });
  await prisma.absence.updateMany({ where: { sessionId }, data: { sessionId: null } });
  await prisma.session.delete({ where: { id: sessionId } });
  res.json({ message: 'Séance supprimée' });
};

export const toggleSessionRealise = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, course: { teacherId } },
  });
  if (!session) { res.status(404).json({ message: 'Séance non trouvée' }); return; }
  const updated = await prisma.session.update({
    where: { id: req.params.id },
    data: { realise: !session.realise },
  });
  res.json({ realise: updated.realise });
};
