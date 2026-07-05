import { Router } from 'express';
import { getGradesByEvaluation, upsertGrade, deleteGrade } from '../controllers/grade.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/evaluation/:evaluationId', getGradesByEvaluation);
router.put('/', upsertGrade);
router.delete('/:id', deleteGrade);

export default router;
