import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const resourceSchema = z.object({
  titre: z.string().min(1),
  type: z.enum(['PDF', 'LIEN', 'IMAGE', 'VIDEO', 'AUTRE']),
  url: z.string().url().optional().nullable(),
  sessionId: z.string().uuid(),
});

// Ensure the session belongs to a course owned by the teacher
const ownsSession = async (sessionId: string, teacherId: string) =>
  prisma.session.findFirst({ where: { id: sessionId, course: { teacherId } } });

export const getResources = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const sessionId = req.query.sessionId as string | undefined;
  const resources = await prisma.resource.findMany({
    where: {
      sessionId: sessionId || undefined,
      session: { course: { teacherId } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(resources);
};

export const createResource = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const session = await ownsSession(parsed.data.sessionId, teacherId);
  if (!session) { res.status(404).json({ message: 'Séance non trouvée' }); return; }
  const resource = await prisma.resource.create({ data: parsed.data });
  res.status(201).json(resource);
};

export const deleteResource = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const resource = await prisma.resource.findFirst({
    where: { id: req.params.id, session: { course: { teacherId } } },
  });
  if (!resource) { res.status(404).json({ message: 'Ressource non trouvée' }); return; }
  await prisma.resource.delete({ where: { id: req.params.id } });
  res.json({ message: 'Ressource supprimée' });
};
