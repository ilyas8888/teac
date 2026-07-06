import { Router } from 'express';
import { presentSession } from '../controllers/present.controller';

const router = Router();

router.get('/:id', presentSession);

export default router;
