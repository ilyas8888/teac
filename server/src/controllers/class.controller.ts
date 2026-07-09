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
  const cls = await prisma.class.findFirst({ where: { id: req.params.id, teacherId } });
  if (!cls) { res.status(404).json({ message: 'Classe non trouvée' }); return; }
  await prisma.student.deleteMany({ where: { classId: req.params.id } });
  await prisma.class.delete({ where: { id: req.params.id } });
  res.json({ message: 'Classe supprimée' });
};

export const getClassStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const classId = req.params.id;

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId },
    include: { _count: { select: { students: true } } },
  });
  if (!cls) { res.status(404).json({ message: 'Classe non trouvée' }); return; }

  const [students, sessions, grades] = await Promise.all([
    prisma.student.findMany({
      where: { classId },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    }),
    prisma.session.findMany({
      where: { classId },
      include: { course: { select: { id: true, nom: true, matiere: true, couleur: true } } },
      orderBy: { date: 'asc' },
    }),
    prisma.grade.findMany({
      where: { student: { classId } },
      include: { evaluation: { select: { id: true, titre: true, bareme: true, date: true } } },
    }),
  ]);

  const evalMap = new Map<string, { id: string; titre: string; bareme: number; date: Date }>();
  grades.forEach((g) => { if (!evalMap.has(g.evaluationId)) evalMap.set(g.evaluationId, g.evaluation); });
  const evaluations = Array.from(evalMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  res.json({
    class: cls,
    students,
    evaluations,
    grades: grades.map((g) => ({ studentId: g.studentId, evaluationId: g.evaluationId, note: g.note })),
    sessions,
  });
};
