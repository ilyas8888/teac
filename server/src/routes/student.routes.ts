import { Router } from 'express';
import multer from 'multer';
import { getStudents, getStudent, createStudent, updateStudent, deleteStudent, bulkCreateStudents, importStudentsFromExcel } from '../controllers/student.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authMiddleware);

router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.post('/bulk', bulkCreateStudents);
router.post('/import', upload.single('file'), importStudentsFromExcel);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
