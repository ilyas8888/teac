import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack);
  // Never leak internal error details / stack to clients in production.
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({ message: isDev ? err.message || 'Erreur interne du serveur' : 'Erreur interne du serveur' });
};
