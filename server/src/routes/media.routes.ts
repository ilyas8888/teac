import { Router } from 'express';
import { getUploadSignature } from '../controllers/media.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/signature', getUploadSignature);

export default router;
