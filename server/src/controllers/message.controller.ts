import { Response } from 'express';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const msgSchema = z.object({
  sujet: z.string().min(1),
  corps: z.string().min(1),
  receiverId: z.string().uuid(),
});

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const type = req.query.type as string | undefined;
  const where = type === 'sent' ? { senderId: userId } : { receiverId: userId };
  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: { select: { nom: true, prenom: true } },
      receiver: { select: { nom: true, prenom: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(messages);
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const senderId = req.userId as string;
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: 'Données invalides' }); return; }
  const msg = await prisma.message.create({ data: { ...parsed.data, senderId } });
  res.status(201).json(msg);
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const receiverId = req.userId as string;
  await prisma.message.updateMany({
    where: { id: req.params.id, receiverId },
    data: { lu: true },
  });
  res.json({ message: 'Message marqué comme lu' });
};

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const senderId = req.userId as string;
  await prisma.message.deleteMany({ where: { id: req.params.id, senderId } });
  res.json({ message: 'Message supprimé' });
};
