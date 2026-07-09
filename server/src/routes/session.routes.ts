import { Router } from 'express';
import { getSessions, getSession, createSession, updateSession, deleteSession, toggleSessionRealise } from '../controllers/session.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getSessions);
router.get('/:id', getSession);
router.post('/', createSession);
router.put('/:id', updateSession);
router.patch('/:id/realise', toggleSessionRealise);
router.delete('/:id', deleteSession);

export default router;
