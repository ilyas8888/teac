import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const moduleSchema = z.object({
  titre: z.string().min(1).max(200),
  courseId: z.string().min(1),
});

const reorderSchema = z.object({
  courseId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)),
});

// GET /api/modules?courseId=
export async function getModules(req: AuthRequest, res: Response): Promise<void> {
  const courseId = req.query.courseId;
  if (typeof courseId !== 'string') {
    res.status(400).json({ message: 'courseId requis' });
    return;
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.teacherId !== req.userId) {
    res.status(403).json({ message: 'Accès refusé' });
    return;
  }
  const modules = await prisma.module.findMany({
    where: { courseId },
    orderBy: { ordre: 'asc' },
  });
  res.json(modules);
}

// POST /api/modules
export async function createModule(req: AuthRequest, res: Response): Promise<void> {
  const parsed = moduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides', errors: parsed.error.flatten() });
    return;
  }
  const { titre, courseId } = parsed.data;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.teacherId !== req.userId) {
    res.status(403).json({ message: 'Accès refusé' });
    return;
  }
  const count = await prisma.module.count({ where: { courseId } });
  const module = await prisma.module.create({
    data: { titre, courseId, ordre: count },
  });
  res.status(201).json(module);
}

// PUT /api/modules/reorder
export async function reorderModules(req: AuthRequest, res: Response): Promise<void> {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides' });
    return;
  }
  const { courseId, orderedIds } = parsed.data;
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.teacherId !== req.userId) {
    res.status(403).json({ message: 'Accès refusé' });
    return;
  }
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.module.update({ where: { id }, data: { ordre: index } }))
  );
  res.json({ ok: true });
}

// PUT /api/modules/:id
export async function updateModule(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const mod = await prisma.module.findUnique({ where: { id }, include: { course: true } });
  if (!mod || mod.course.teacherId !== req.userId) {
    res.status(403).json({ message: 'Accès refusé' });
    return;
  }
  const parsed = z.object({ titre: z.string().min(1).max(200).optional(), ordre: z.number().int().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides' });
    return;
  }
  const updated = await prisma.module.update({ where: { id }, data: parsed.data });
  res.json(updated);
}

// DELETE /api/modules/:id
export async function deleteModule(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const mod = await prisma.module.findUnique({ where: { id }, include: { course: true } });
  if (!mod || mod.course.teacherId !== req.userId) {
    res.status(403).json({ message: 'Accès refusé' });
    return;
  }
  await prisma.module.delete({ where: { id } });
  res.json({ ok: true });
}
