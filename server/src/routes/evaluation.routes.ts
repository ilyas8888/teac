import { Router } from 'express';
import { getEvaluations, getEvaluation, createEvaluation, updateEvaluation, deleteEvaluation } from '../controllers/evaluation.controller';
import { authMiddleware as authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getEvaluations);
router.get('/:id', getEvaluation);
router.post('/', createEvaluation);
router.put('/:id', updateEvaluation);
router.delete('/:id', deleteEvaluation);

export default router;
