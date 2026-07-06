import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const classSchema = z.object({
  nom: z.string().min(1),
  niveau: z.string().min(1),
  groupe: z.string().optional(),
  etablissement: z.string().optional(),
  annee: z.string().min(1),
});

export const getClasses = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const classes = await prisma.class.findMany({
    where: { teacherId },
    include: { _count: { select: { students: true } } },
    orderBy: { nom: 'asc' },
  });
  res.json(classes);
};

export const getClass = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const cls = await prisma.class.findFirst({
    where: { id: req.params.id, teacherId },
    include: { students: true },
  });
  if (!cls) { res.status(404).json({ message: 'Classe non trouvée' }); return; }
  res.json(cls);
};

export const createClass = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = classSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const cls = await prisma.class.create({ data: { ...parsed.data, teacherId } });
  res.status(201).json(cls);
};

export const updateClass = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = classSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const result = await prisma.class.updateMany({
    where: { id: req.params.id, teacherId },
    data: parsed.data,
  });
  if (!result.count) { res.status(404).json({ message: 'Classe non trouvée' }); return; }
  res.json({ message: 'Classe mise à jour' });
};

export const deleteClass = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  await prisma.class.deleteMany({ where: { id: req.params.id, teacherId } });
  res.json({ message: 'Classe supprimée' });
};
