import { Response } from 'express';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  const teacherId = req.userId as string;
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const [classes, students, upcomingSessions, recentAbsences, unreadMessages] = await Promise.all([
    prisma.class.count({ where: { teacherId } }),
    prisma.student.count({ where: { class: { teacherId } } }),
    prisma.session.findMany({
      where: { course: { teacherId }, date: { gte: today, lte: weekAhead } },
      include: { course: { select: { nom: true } }, class: { select: { nom: true } } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.absence.findMany({
      where: { student: { class: { teacherId } }, date: { gte: weekAgo } },
      include: { student: { select: { nom: true, prenom: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.message.count({ where: { receiverId: teacherId, lu: false } }),
  ]);

  res.json({ classes, students, upcomingSessions, recentAbsences, unreadMessages });
};
