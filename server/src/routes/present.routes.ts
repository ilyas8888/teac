import { Router } from 'express';
import { presentSession, getPresentToken } from '../controllers/present.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Authenticated: mint a short-lived, session-scoped token so the presentation
// (opened as a plain browser navigation, which can't carry the auth header) stays private.
router.get('/:id/token', authMiddleware, getPresentToken);
router.get('/:id', presentSession);

export default router;
