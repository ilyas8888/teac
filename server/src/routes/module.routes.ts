import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getModules, createModule, reorderModules, updateModule, deleteModule } from '../controllers/module.controller';

const router = Router();
router.use(authMiddleware);

router.get('/', getModules);
router.post('/', createModule);
router.put('/reorder', reorderModules);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);

export default router;
