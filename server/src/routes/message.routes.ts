import { Router } from 'express';
import { getMessages, sendMessage, markAsRead, deleteMessage } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getMessages);
router.post('/', sendMessage);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteMessage);

export default router;
