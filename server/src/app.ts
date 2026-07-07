import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import classRoutes from './routes/class.routes';
import studentRoutes from './routes/student.routes';
import courseRoutes from './routes/course.routes';
import moduleRoutes from './routes/module.routes';
import sessionRoutes from './routes/session.routes';
import presentRoutes from './routes/present.routes';
import resourceRoutes from './routes/resource.routes';
import mediaRoutes from './routes/media.routes';
import unfurlRoutes from './routes/unfurl.routes';
import evaluationRoutes from './routes/evaluation.routes';
import gradeRoutes from './routes/grade.routes';
import absenceRoutes from './routes/absence.routes';
import observationRoutes from './routes/observation.routes';
import messageRoutes from './routes/message.routes';
import eventRoutes from './routes/event.routes';
import aiRoutes from './routes/ai.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/present', presentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/unfurl', unfurlRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/absences', absenceRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
