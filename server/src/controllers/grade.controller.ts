import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const gradeSchema = z.object({
  note: z.number().min(0),
  commentaire: z.string().optional(),
  studentId: z.string().uuid(),
  evaluationId: z.string().uuid(),
});

export const getGradesByEvaluation = async (req: AuthRequest, res: Response): Promise<void> => {
  const evaluationId = req.params.evaluationId;
  const grades = await prisma.grade.findMany({
    where: { evaluationId },
    include: { student: { select: { id: true, nom: true, prenom: true } } },
  });
  res.json(grades);
};

export const upsertGrade = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = gradeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { studentId, evaluationId, note, commentaire } = parsed.data;
  const grade = await prisma.grade.upsert({
    where: { studentId_evaluationId: { studentId, evaluationId } },
    update: { note, commentaire },
    create: { studentId, evaluationId, note, commentaire },
  });
  res.json(grade);
};

export const deleteGrade = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.grade.delete({ where: { id: req.params.id } });
  res.json({ message: 'Note supprimée' });
};
