import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import StudentsPage from './pages/StudentsPage';

// Heavy: pulls in BlockNote — split out of the main bundle
const SessionEditorPage = lazy(() => import('./pages/SessionEditorPage'));
const PresentationCustomizePage = lazy(() => import('./pages/PresentationCustomizePage'));
const SlideStudioPage = lazy(() => import('./pages/SlideStudioPage'));
const CourseCreatePage = lazy(() => import('./pages/CourseCreatePage'));
import EvaluationsPage from './pages/EvaluationsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import MessagesPage from './pages/MessagesPage';
import CalendarPage from './pages/CalendarPage';
import ClassesPage from './pages/ClassesPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/courses/:courseId/sessions/:sessionId/customize"
        element={<ProtectedRoute><Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}><PresentationCustomizePage /></Suspense></ProtectedRoute>} />
      <Route path="/courses/:courseId/sessions/:sessionId/slide-studio"
        element={<ProtectedRoute><Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}><SlideStudioPage /></Suspense></ProtectedRoute>} />
      <Route path="/courses/new"
        element={<ProtectedRoute><Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}><CourseCreatePage /></Suspense></ProtectedRoute>} />
      <Route path="/courses/:id/edit"
        element={<ProtectedRoute><Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}><CourseCreatePage /></Suspense></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="courses/:courseId/sessions/:sessionId"
          element={<Suspense fallback={<div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}><SessionEditorPage /></Suspense>} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="evaluations" element={<EvaluationsPage />} />
        <Route path="ai-assistant" element={<AIAssistantPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
