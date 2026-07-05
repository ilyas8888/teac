import { Router } from 'express';
import { getObservations, createObservation, deleteObservation } from '../controllers/observation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/student/:studentId', getObservations);
router.post('/', createObservation);
router.delete('/:id', deleteObservation);

export default router;
