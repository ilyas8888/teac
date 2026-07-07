import { Router } from 'express';
import {
  createModule,
  deleteModule,
  getModule,
  getModules,
  reorderModules,
  updateModule,
} from '../controllers/module.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.post('/reorder', reorderModules);
router.get('/', getModules);
router.get('/:id', getModule);
router.post('/', createModule);
router.put('/:id', updateModule);
router.delete('/:id', deleteModule);

export default router;
