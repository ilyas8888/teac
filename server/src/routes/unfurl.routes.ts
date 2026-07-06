import { Router } from 'express';
import { getUnfurl } from '../controllers/unfurl.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getUnfurl);

export default router;
