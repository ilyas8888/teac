import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../services/prisma.service';
import { AuthRequest } from '../middleware/auth.middleware';

const registerSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  ecole: z.string().optional(),
  matieres: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides', errors: parsed.error.flatten() });
    return;
  }
  const { nom, prenom, email, password, ecole, matieres } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: 'Email déjà utilisé' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      nom, prenom, email, passwordHash, ecole, matieres: matieres || [],
      niveauxOptions: ['Technicien Spécialisé', 'Technicien', 'Spécialisation', 'Qualification'],
      groupesOptions: ['Groupe 1', 'Groupe 2', 'Groupe 3', 'Groupe 4'],
      etablissementsOptions: ['ISTA Hay Riad', 'ISTA Sala Al Jadida', 'OFPPT'],
    },
  });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, nom, prenom, email } });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Données invalides' });
    return;
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    return;
  }
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email } });
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, nom: true, prenom: true, email: true, ecole: true, matieres: true },
  });
  if (!user) { res.status(404).json({ message: 'Utilisateur non trouvé' }); return; }
  res.json(user);
};
