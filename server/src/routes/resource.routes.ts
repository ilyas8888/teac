import { Router } from 'express';
import { getResources, createResource, deleteResource } from '../controllers/resource.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getResources);
router.post('/', createResource);
router.delete('/:id', deleteResource);

export default router;
