import { Router } from 'express';
import { generateContent } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.post('/generate', generateContent);

export default router;
