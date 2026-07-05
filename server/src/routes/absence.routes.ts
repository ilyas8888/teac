import { Router } from 'express';
import { getAbsences, createAbsence, updateAbsence, deleteAbsence } from '../controllers/absence.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getAbsences);
router.post('/', createAbsence);
router.put('/:id', updateAbsence);
router.delete('/:id', deleteAbsence);

export default router;
