import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request<Record<string, string>> {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Token manquant' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId?: string; type?: string };
    // Only full access tokens pass here — not 2FA-pending or present tokens.
    if (decoded.type !== 'access' || !decoded.userId) {
      res.status(401).json({ message: 'Token invalide' });
      return;
    }
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide' });
  }
};
