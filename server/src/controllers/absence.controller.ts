import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const absenceSchema = z.object({
  date: z.string(),
  justifiee: z.boolean().optional().default(false),
  motif: z.string().optional(),
  studentId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
});

export const getAbsences = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const studentId = req.query.studentId as string | undefined;
  const classId = req.query.classId as string | undefined;
  const absences = await prisma.absence.findMany({
    where: {
      studentId: studentId || undefined,
      student: {
        classId: classId || undefined,
        class: { teacherId },
      },
    },
    include: { student: { select: { nom: true, prenom: true } }, session: { select: { titre: true } } },
    orderBy: { date: 'desc' },
  });
  res.json(absences);
};

export const createAbsence = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = absenceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const absence = await prisma.absence.create({
    data: { ...parsed.data, date: new Date(parsed.data.date) },
  });
  res.status(201).json(absence);
};

export const updateAbsence = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({ justifiee: z.boolean(), motif: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  await prisma.absence.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ message: 'Absence mise à jour' });
};

export const deleteAbsence = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.absence.delete({ where: { id: req.params.id } });
  res.json({ message: 'Absence supprimée' });
};
