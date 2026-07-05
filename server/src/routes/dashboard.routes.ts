import { Router } from 'express';
import { getSummary } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/summary', getSummary);

export default router;
