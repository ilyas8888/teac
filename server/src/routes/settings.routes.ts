import { Router } from 'express';
import { getSettings, updateSettings, changePassword } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSettings);
router.put('/', authMiddleware, updateSettings);
router.put('/password', authMiddleware, changePassword);

export default router;
