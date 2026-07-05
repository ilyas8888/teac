import { Router } from 'express';
import { getEvaluations, getEvaluation, createEvaluation, updateEvaluation, deleteEvaluation } from '../controllers/evaluation.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getEvaluations);
router.get('/:id', getEvaluation);
router.post('/', createEvaluation);
router.put('/:id', updateEvaluation);
router.delete('/:id', deleteEvaluation);

export default router;
