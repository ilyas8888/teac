import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const studentSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email().optional().nullable(),
  dateNaissance: z.string().optional().nullable(),
  classId: z.string().uuid(),
});

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const classId = req.query.classId as string | undefined;
  const students = await prisma.student.findMany({
    where: {
      classId: classId || undefined,
      class: { teacherId },
    },
    include: {
      class: { select: { nom: true, groupe: true, etablissement: true } },
      _count: { select: { absences: true, grades: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });
  res.json(students);
};

export const getStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const student = await prisma.student.findFirst({
    where: { id: req.params.id, class: { teacherId } },
    include: {
      class: true,
      grades: { include: { evaluation: true } },
      absences: { orderBy: { date: 'desc' } },
      observations: { orderBy: { date: 'desc' } },
    },
  });
  if (!student) { res.status(404).json({ message: 'Élève non trouvé' }); return; }
  res.json(student);
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { dateNaissance, ...rest } = parsed.data;
  const student = await prisma.student.create({
    data: { ...rest, dateNaissance: dateNaissance ? new Date(dateNaissance) : null },
  });
  res.status(201).json(student);
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = studentSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { dateNaissance, ...rest } = parsed.data;
  await prisma.student.update({
    where: { id: req.params.id },
    data: { ...rest, ...(dateNaissance !== undefined ? { dateNaissance: dateNaissance ? new Date(dateNaissance) : null } : {}) },
  });
  res.json({ message: 'Élève mis à jour' });
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.student.delete({ where: { id: req.params.id } });
  res.json({ message: 'Élève supprimé' });
};
