import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const moduleSchema = z.object({
  titre: z.string().min(1),
  ordre: z.number().int().optional(),
  image: z.string().url().optional().nullable(),
  courseId: z.string().uuid(),
});

const reorderSchema = z.object({
  courseId: z.string().uuid(),
  moduleIds: z.array(z.string().min(1)).min(1),
});

const ownsCourse = async (courseId: string, teacherId: string) =>
  prisma.course.findFirst({ where: { id: courseId, teacherId }, select: { id: true } });

export const getModules = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const courseId = req.query.courseId as string | undefined;

  const modules = await prisma.module.findMany({
    where: {
      courseId: courseId || undefined,
      course: { teacherId },
    },
    include: { _count: { select: { sessions: true } } },
    orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(modules);
};

export const getModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const module = await prisma.module.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    include: { sessions: { orderBy: { date: 'asc' } } },
  });

  if (!module) { res.status(404).json({ message: 'Module non trouvé' }); return; }
  res.json(module);
};

export const createModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const course = await ownsCourse(parsed.data.courseId, teacherId);
  if (!course) { res.status(404).json({ message: 'Cours non trouvé' }); return; }

  const ordre = parsed.data.ordre ?? (await prisma.module.count({ where: { courseId: parsed.data.courseId } }));
  const module = await prisma.module.create({ data: { ...parsed.data, ordre } });

  res.status(201).json(module);
};

export const updateModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = moduleSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const existing = await prisma.module.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    select: { id: true, courseId: true },
  });
  if (!existing) { res.status(404).json({ message: 'Module non trouvé' }); return; }

  if (parsed.data.courseId && parsed.data.courseId !== existing.courseId) {
    const course = await ownsCourse(parsed.data.courseId, teacherId);
    if (!course) { res.status(404).json({ message: 'Cours non trouvé' }); return; }
  }

  const module = await prisma.module.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  res.json(module);
};

export const deleteModule = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const module = await prisma.module.findFirst({
    where: { id: req.params.id, course: { teacherId } },
    select: { id: true },
  });
  if (!module) { res.status(404).json({ message: 'Module non trouvé' }); return; }

  await prisma.module.delete({ where: { id: req.params.id } });
  res.json({ message: 'Module supprimé' });
};

export const reorderModules = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }

  const course = await ownsCourse(parsed.data.courseId, teacherId);
  if (!course) { res.status(404).json({ message: 'Cours non trouvé' }); return; }

  const modules = await prisma.module.findMany({
    where: { courseId: parsed.data.courseId },
    select: { id: true },
  });
  const moduleIds = new Set(modules.map((module) => module.id));
  const requestedIds = new Set(parsed.data.moduleIds);

  if (requestedIds.size !== parsed.data.moduleIds.length || parsed.data.moduleIds.some((id) => !moduleIds.has(id))) {
    res.status(400).json({ message: 'Ordre de modules invalide' });
    return;
  }

  await prisma.$transaction(
    parsed.data.moduleIds.map((id, ordre) =>
      prisma.module.update({
        where: { id },
        data: { ordre },
      }),
    ),
  );

  const orderedModules = await prisma.module.findMany({
    where: { courseId: parsed.data.courseId },
    include: { _count: { select: { sessions: true } } },
    orderBy: [{ ordre: 'asc' }, { createdAt: 'asc' }],
  });

  res.json(orderedModules);
};
