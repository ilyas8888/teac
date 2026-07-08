import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const evaluationSchema = z.object({
  titre: z.string().min(1),
  bareme: z.number().positive(),
  date: z.string(),
  content: z.unknown().optional(),
  courseIds: z.array(z.string().min(1)),
});

const evaluationInclude = {
  courses: {
    include: {
      course: {
        select: { id: true, nom: true },
      },
    },
  },
  _count: {
    select: { grades: true },
  },
} as const;

const jsonContent = (content: unknown): { content?: Prisma.InputJsonValue | typeof Prisma.JsonNull } => {
  if (content === undefined) return {};
  return { content: content === null ? Prisma.JsonNull : content as Prisma.InputJsonValue };
};

export const getEvaluations = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const evaluations = await prisma.evaluation.findMany({
    where: { teacherId },
    include: evaluationInclude,
    orderBy: { date: 'desc' },
  });
  res.json(evaluations);
};

export const getEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: req.params.id },
    include: evaluationInclude,
  });
  if (!evaluation || evaluation.teacherId !== teacherId) {
    res.status(404).json({ message: 'Evaluation non trouvee' });
    return;
  }
  res.json(evaluation);
};

export const createEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = evaluationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Donnees invalides' });
    return;
  }

  const { courseIds, date, content, ...data } = parsed.data;
  const evaluation = await prisma.evaluation.create({
    data: {
      ...data,
      ...jsonContent(content),
      date: new Date(date),
      teacherId: req.userId!,
      courses: {
        create: courseIds.map((courseId) => ({ courseId })),
      },
    },
    include: evaluationInclude,
  });
  res.status(201).json(evaluation);
};

export const updateEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = evaluationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Donnees invalides' });
    return;
  }

  const existing = await prisma.evaluation.findUnique({
    where: { id: req.params.id },
    select: { teacherId: true },
  });
  if (!existing || existing.teacherId !== teacherId) {
    res.status(404).json({ message: 'Evaluation non trouvee' });
    return;
  }

  const { courseIds, date, content, ...data } = parsed.data;
  const [, evaluation] = await prisma.$transaction([
    prisma.evaluationCourse.deleteMany({ where: { evaluationId: req.params.id } }),
    prisma.evaluation.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...jsonContent(content),
        date: new Date(date),
        courses: {
          create: courseIds.map((courseId) => ({ courseId })),
        },
      },
      include: evaluationInclude,
    }),
  ]);
  res.json(evaluation);
};

export const deleteEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: req.params.id },
    select: { teacherId: true },
  });
  if (!evaluation || evaluation.teacherId !== teacherId) {
    res.status(404).json({ message: 'Evaluation non trouvee' });
    return;
  }

  await prisma.evaluation.delete({ where: { id: req.params.id } });
  res.json({ message: 'Evaluation supprimee' });
};
