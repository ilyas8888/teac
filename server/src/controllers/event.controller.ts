import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const eventSchema = z.object({
  titre: z.string().min(1),
  type: z.enum(['SEANCE', 'REUNION', 'ECHEANCE', 'PERSONNEL']),
  debut: z.string(),
  fin: z.string(),
  description: z.string().optional(),
});

export const getEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;
  const events = await prisma.event.findMany({
    where: {
      teacherId,
      debut: start ? { gte: new Date(start) } : undefined,
      fin: end ? { lte: new Date(end) } : undefined,
    },
    orderBy: { debut: 'asc' },
  });
  res.json(events);
};

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const event = await prisma.event.create({
    data: { ...parsed.data, debut: new Date(parsed.data.debut), fin: new Date(parsed.data.fin), teacherId },
  });
  res.status(201).json(event);
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = eventSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const { debut, fin, ...rest } = parsed.data;
  await prisma.event.updateMany({
    where: { id: req.params.id, teacherId },
    data: { ...rest, ...(debut ? { debut: new Date(debut) } : {}), ...(fin ? { fin: new Date(fin) } : {}) },
  });
  res.json({ message: 'Événement mis à jour' });
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  await prisma.event.deleteMany({ where: { id: req.params.id, teacherId } });
  res.json({ message: 'Événement supprimé' });
};
