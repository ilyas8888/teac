import { Router } from 'express';
import { getClasses, getClass, createClass, updateClass, deleteClass, getClassStats } from '../controllers/class.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getClasses);
router.get('/:id/stats', getClassStats);
router.get('/:id', getClass);
router.post('/', createClass);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);

export default router;
