import { useReducer, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Layers, Clock, Users, Calendar, Target, FileText,
  Trash2, Pencil, ChevronDown, X, Link2, File, Image, Video, Paperclip,
  ExternalLink, BookOpen, MoreVertical, ChevronUp,
} from 'lucide-react';
import api from '../services/api';
import type { Course, Session, Class, Resource, Module as CourseModule } from '../types';
import { courseTheme } from '../lib/courseTheme';
import ImageUpload from '../components/ImageUpload';
import {
  sessionStatus, STATUS_META, formatSessionDate, formatShortDate, formatDuration,
} from '../lib/sessionUtils';

const RESOURCE_TYPES: { value: Resource['type']; label: string; icon: React.ReactNode }[] = [
  { value: 'LIEN', label: 'Lien', icon: <Link2 size={14} /> },
  { value: 'PDF', label: 'PDF', icon: <File size={14} /> },
  { value: 'IMAGE', label: 'Image', icon: <Image size={14} /> },
  { value: 'VIDEO', label: 'Vidéo', icon: <Video size={14} /> },
  { value: 'AUTRE', label: 'Autre', icon: <Paperclip size={14} /> },
];

const resourceIcon = (type: Resource['type']) =>
  RESOURCE_TYPES.find((t) => t.value === type)?.icon ?? <Paperclip size={14} />;

const emptySession = { titre: '', objectifs: '', contenu: '', image: '', duree: 120, date: '', classId: '', moduleId: '' };

type ModuleState = {
  expandedIds: string[];
  menuId: string | null;
  renamingId: string | null;
  draftTitle: string;
  editingImageId: string | null;
};

type ModuleAction =
  | { type: 'toggle'; id: string }
  | { type: 'openMenu'; id: string | null }
  | { type: 'startRename'; id: string; title: string }
  | { type: 'setDraftTitle'; title: string }
  | { type: 'stopRename' }
  | { type: 'expand'; id: string }
  | { type: 'startImageEdit'; id: string }
  | { type: 'stopImageEdit' };

const initialModuleState: ModuleState = {
  expandedIds: [],
  menuId: null,
  renamingId: null,
  draftTitle: '',
  editingImageId: null,
};

function moduleReducer(state: ModuleState, action: ModuleAction): ModuleState {
  switch (action.type) {
    case 'toggle':
      return {
        ...state,
        expandedIds: state.expandedIds.includes(action.id)
          ? state.expandedIds.filter((id) => id !== action.id)
          : [...state.expandedIds, action.id],
        menuId: null,
      };
    case 'openMenu':
      return { ...state, menuId: action.id };
    case 'startRename':
      return { ...state, renamingId: action.id, draftTitle: action.title, menuId: null };
    case 'setDraftTitle':
      return { ...state, draftTitle: action.title };
    case 'stopRename':
      return { ...state, renamingId: null, draftTitle: '' };
    case 'expand':
      return state.expandedIds.includes(action.id)
        ? state
        : { ...state, expandedIds: [...state.expandedIds, action.id] };
    case 'startImageEdit':
      return { ...state, editingImageId: action.id, menuId: null };
    case 'stopImageEdit':
      return { ...state, editingImageId: null };
    default:
      return state;
  }
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState(emptySession);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [moduleState, dispatchModule] = useReducer(moduleReducer, initialModuleState);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery<CourseModule[]>({
    queryKey: ['modules', id],
    queryFn: () => api.get('/modules', { params: { courseId: id } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<Session[]>({
    queryKey: ['sessions', id],
    queryFn: () => api.get('/sessions', { params: { courseId: id } }).then((r) => r.data),
    enabled: !!id,
  });

  const { data: classes = [] } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => api.get('/classes').then((r) => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sessions', id] });
    qc.invalidateQueries({ queryKey: ['modules', id] });
    qc.invalidateQueries({ queryKey: ['course', id] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/sessions', {
      ...data,
      courseId: id,
      duree: Number(data.duree),
      moduleId: data.moduleId || null,
      image: data.image || null,
    }),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const update = useMutation({
    mutationFn: ({ sid, data }: { sid: string; data: typeof form }) =>
      api.put(`/sessions/${sid}`, {
        ...data,
        duree: Number(data.duree),
        moduleId: data.moduleId || null,
        image: data.image || null,
      }),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const remove = useMutation({
    mutationFn: (sid: string) => api.delete(`/sessions/${sid}`),
    onSuccess: invalidate,
  });

  const createModule = useMutation({
    mutationFn: (titre: string) => api.post('/modules', { titre, courseId: id }),
    onSuccess: (response) => {
      setNewModuleTitle('');
      dispatchModule({ type: 'expand', id: response.data.id });
      invalidate();
    },
  });

  const renameModule = useMutation({
    mutationFn: ({ moduleId, titre }: { moduleId: string; titre: string }) => api.put(`/modules/${moduleId}`, { titre }),
    onSuccess: () => {
      dispatchModule({ type: 'stopRename' });
      invalidate();
    },
  });

  const updateModuleImage = useMutation({
    mutationFn: ({ moduleId, image }: { moduleId: string; image: string | null }) =>
      api.put(`/modules/${moduleId}`, { image }),
    onSuccess: () => {
      dispatchModule({ type: 'stopImageEdit' });
      invalidate();
    },
  });

  const deleteModule = useMutation({
    mutationFn: (moduleId: string) => api.delete(`/modules/${moduleId}`),
    onSuccess: invalidate,
  });

  const reorderModules = useMutation({
    mutationFn: (orderedIds: string[]) => api.post('/modules/reorder', { courseId: id, moduleIds: orderedIds }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['modules', id] });
      const previous = qc.getQueryData<CourseModule[]>(['modules', id]);
      if (previous) {
        const byId = new Map(previous.map((module) => [module.id, module]));
        qc.setQueryData<CourseModule[]>(['modules', id], orderedIds
          .map((moduleId, ordre) => ({ ...byId.get(moduleId)!, ordre }))
          .filter(Boolean));
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) qc.setQueryData(['modules', id], context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['modules', id] }),
  });

  const moveSession = useMutation({
    mutationFn: ({ sessionId, moduleId }: { sessionId: string; moduleId: string | null }) =>
      api.put(`/sessions/${sessionId}`, { moduleId }),
    onSuccess: invalidate,
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySession); };
  const openCreate = (moduleId = '') => {
    setEditing(null);
    setForm({ ...emptySession, classId: classes[0]?.id || '', moduleId });
    setShowForm(true);
  };
  const openEdit = (session: Session) => {
    setEditing(session);
    setForm({
      titre: session.titre,
      objectifs: session.objectifs,
      contenu: session.contenu || '',
      image: session.image || '',
      duree: session.duree,
      date: session.date.slice(0, 16),
      classId: session.classId,
      moduleId: session.moduleId || '',
    });
    setShowForm(true);
  };
  const submit = () => {
    if (editing) update.mutate({ sid: editing.id, data: form });
    else create.mutate(form);
  };

  if (courseLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }
  if (!course) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="mb-4">Cours introuvable.</p>
        <button onClick={() => navigate('/courses')} className="text-indigo-700 font-medium hover:underline">← Retour aux cours</button>
      </div>
    );
  }

  const theme = courseTheme(course.matiere);
  const accentStyle = course.couleur ? { backgroundColor: course.couleur } : undefined;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duree, 0);
  const pending = create.isPending || update.isPending;
  const sortedModules = [...modules].sort((a, b) => a.ordre - b.ordre || a.createdAt.localeCompare(b.createdAt));
  const sessionsByModule = new Map<string, Session[]>();
  const unclassifiedSessions: Session[] = [];

  sessions.forEach((session) => {
    if (session.moduleId) {
      const current = sessionsByModule.get(session.moduleId) ?? [];
      current.push(session);
      sessionsByModule.set(session.moduleId, current);
    } else {
      unclassifiedSessions.push(session);
    }
  });

  const sortSessions = (items: Session[]) =>
    [...items].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const upcomingCount = sessions.filter((s) => sessionStatus(s.date) !== 'past').length;
  const loadingStructure = sessionsLoading || modulesLoading;

  function moveModule(moduleId: string, direction: -1 | 1) {
    const index = sortedModules.findIndex((module) => module.id === moduleId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= sortedModules.length) return;
    const orderedIds = sortedModules.map((module) => module.id);
    [orderedIds[index], orderedIds[nextIndex]] = [orderedIds[nextIndex], orderedIds[index]];
    reorderModules.mutate(orderedIds);
  }

  function submitNewModule() {
    const title = newModuleTitle.trim();
    if (!title) return;
    createModule.mutate(title);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/courses')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft size={16} /> Cours
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        {course.image ? (
          <div className="relative h-36 w-full overflow-hidden">
            <img src={course.image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
          </div>
        ) : (
          <div className={course.couleur ? 'h-2' : `h-2 bg-gradient-to-r ${theme.gradient}`} style={accentStyle} />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`${course.couleur ? '' : theme.bg} p-3 rounded-xl`} style={course.couleur ? { backgroundColor: `${course.couleur}1A` } : undefined}>
                <BookOpen size={24} className={course.couleur ? '' : theme.text} style={course.couleur ? { color: course.couleur } : undefined} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course.nom}</h1>
                <span className={`inline-block text-xs font-medium ${course.couleur ? '' : `${theme.text} ${theme.bg}`} px-2 py-0.5 rounded-full mt-1`}
                  style={course.couleur ? { color: course.couleur, backgroundColor: `${course.couleur}1A` } : undefined}>
                  {course.matiere}
                </span>
                {course.description && <p className="text-sm text-gray-500 mt-3 max-w-2xl">{course.description}</p>}
                {(course.niveau || course.nbHeures || course.publicCible) && (
                  <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
                    {course.niveau && <span>{course.niveau}</span>}
                    {course.nbHeures && <span>{course.nbHeures} h</span>}
                    {course.publicCible && <span>{course.publicCible}</span>}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => navigate(`/courses/${course.id}/edit`)}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 rounded-lg px-3 py-1.5 transition-colors">
              <Pencil size={14} /> Modifier
            </button>
          </div>
          <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-gray-100 text-sm">
            <Metric icon={<Layers size={16} className="text-indigo-600" />} value={sessions.length} label="séances" />
            <Metric icon={<BookOpen size={16} className="text-sky-600" />} value={modules.length} label="modules" />
            <Metric icon={<Clock size={16} className="text-emerald-600" />} value={formatDuration(totalMinutes)} label="au total" />
            <Metric icon={<Calendar size={16} className="text-amber-600" />} value={upcomingCount} label="à venir" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Modules & séances</h2>
        <button onClick={() => openCreate()}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouvelle séance
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <div className="flex gap-2">
          <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitNewModule(); }}
            placeholder="Titre du nouveau module"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={submitNewModule} disabled={!newModuleTitle.trim() || createModule.isPending}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {loadingStructure ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : sessions.length === 0 && modules.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4">Aucune séance planifiée pour ce cours.</p>
          <button onClick={() => openCreate()}
            className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
            <Plus size={16} /> Planifier une séance
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedModules.map((module, index) => (
            <ModuleRow key={module.id}
              module={module}
              sessions={sortSessions(sessionsByModule.get(module.id) ?? [])}
              modules={sortedModules}
              index={index}
              total={sortedModules.length}
              state={moduleState}
              dispatch={dispatchModule}
              expandedSession={expandedSession}
              setExpandedSession={setExpandedSession}
              onCreateSession={() => openCreate(module.id)}
              onRename={(title) => renameModule.mutate({ moduleId: module.id, titre: title })}
              onDelete={() => { if (confirm(`Supprimer le module « ${module.titre} » ? Les séances seront conservées sans module.`)) deleteModule.mutate(module.id); }}
              onMove={(direction) => moveModule(module.id, direction)}
              onEditSession={openEdit}
              onDeleteSession={(sessionId) => remove.mutate(sessionId)}
              onOpenContent={(session) => navigate(`/courses/${id}/sessions/${session.id}`)}
              onMoveSession={(sessionId, moduleId) => moveSession.mutate({ sessionId, moduleId })}
              onImageChange={(image) => updateModuleImage.mutate({ moduleId: module.id, image })}
            />
          ))}

          {unclassifiedSessions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Séances sans module</h3>
              <div className="space-y-3">
                {sortSessions(unclassifiedSessions).map((session) => (
                  <SessionCard key={session.id} session={session}
                    isOpen={expandedSession === session.id}
                    modules={sortedModules}
                    onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                    onEdit={() => openEdit(session)}
                    onOpenContent={() => navigate(`/courses/${id}/sessions/${session.id}`)}
                    onDelete={() => { if (confirm(`Supprimer la séance « ${session.titre} » ?`)) remove.mutate(session.id); }}
                    onMoveToModule={(moduleId) => moveSession.mutate({ sessionId: session.id, moduleId })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900 text-lg">{editing ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {classes.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2 mb-4">
                Vous devez d'abord créer une classe avant de planifier une séance.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la séance</label>
                <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Introduction aux composants React" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & heure</label>
                  <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée (min)</label>
                  <input type="number" min={15} step={15} value={form.duree}
                    onChange={(e) => setForm({ ...form, duree: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classe cible</label>
                  <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Choisir...</option>
                    {classes.map((classe) => (
                      <option key={classe.id} value={classe.id}>{classe.nom}{classe.groupe ? ` - ${classe.groupe}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                  <select value={form.moduleId} onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Sans module</option>
                    {sortedModules.map((module) => <option key={module.id} value={module.id}>{module.titre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Target size={14} className="text-indigo-600" /> Objectifs pédagogiques
                </label>
                <textarea value={form.objectifs} onChange={(e) => setForm({ ...form, objectifs: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ce que les apprenants sauront faire à la fin de la séance..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" /> Contenu / déroulé
                </label>
                <textarea value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Plan de la séance, activités, points clés..." />
              </div>

              <ImageUpload
                label="Image de la séance"
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url ?? '' })}
                aspectRatio="wide"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={submit}
                disabled={!form.titre || !form.objectifs || !form.date || !form.classId || pending}
                className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
                {pending ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer la séance'}
              </button>
              <button onClick={closeForm}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-semibold text-gray-900">{value}</span>
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

function ModuleRow({ module, sessions, modules, index, total, state, dispatch, expandedSession, setExpandedSession, onCreateSession, onRename, onDelete, onMove, onEditSession, onDeleteSession, onOpenContent, onMoveSession, onImageChange }: {
  module: CourseModule;
  sessions: Session[];
  modules: CourseModule[];
  index: number;
  total: number;
  state: ModuleState;
  dispatch: React.Dispatch<ModuleAction>;
  expandedSession: string | null;
  setExpandedSession: (id: string | null) => void;
  onCreateSession: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  onEditSession: (session: Session) => void;
  onDeleteSession: (id: string) => void;
  onOpenContent: (session: Session) => void;
  onMoveSession: (sessionId: string, moduleId: string | null) => void;
  onImageChange: (image: string | null) => void;
}) {
  const isExpanded = state.expandedIds.includes(module.id);
  const isRenaming = state.renamingId === module.id;
  const isEditingImage = state.editingImageId === module.id;
  const menuOpen = state.menuId === module.id;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible">
      {module.image && !isEditingImage && (
        <div className="relative h-24 w-full overflow-hidden rounded-t-xl">
          <img src={module.image} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        </div>
      )}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => dispatch({ type: 'toggle', id: module.id })}
          className="text-gray-400 hover:text-gray-700">
          <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input value={state.draftTitle} onChange={(e) => dispatch({ type: 'setDraftTitle', title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && state.draftTitle.trim()) onRename(state.draftTitle.trim());
                if (e.key === 'Escape') dispatch({ type: 'stopRename' });
              }}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          ) : (
            <button onClick={() => dispatch({ type: 'toggle', id: module.id })} className="text-left">
              <h3 className="font-semibold text-gray-900 truncate">{module.titre}</h3>
              <p className="text-xs text-gray-400">{sessions.length} séance{sessions.length > 1 ? 's' : ''}</p>
            </button>
          )}
        </div>

        {isRenaming ? (
          <div className="flex gap-2">
            <button onClick={() => state.draftTitle.trim() && onRename(state.draftTitle.trim())}
              className="text-sm text-indigo-700 font-medium">Enregistrer</button>
            <button onClick={() => dispatch({ type: 'stopRename' })}
              className="text-sm text-gray-500">Annuler</button>
          </div>
        ) : (
          <div className="flex items-center gap-1 relative">
            <button onClick={onCreateSession}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-indigo-700 hover:text-indigo-900 font-medium px-2 py-1">
              <Plus size={14} /> Séance
            </button>
            <button onClick={() => onMove(-1)} disabled={index === 0}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" title="Monter">
              <ChevronUp size={16} />
            </button>
            <button onClick={() => onMove(1)} disabled={index === total - 1}
              className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" title="Descendre">
              <ChevronDown size={16} />
            </button>
            <button onClick={() => dispatch({ type: 'openMenu', id: menuOpen ? null : module.id })}
              className="text-gray-400 hover:text-gray-700 p-1">
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <button onClick={() => dispatch({ type: 'startRename', id: module.id, title: module.titre })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Renommer</button>
                <button onClick={() => dispatch({ type: 'startImageEdit', id: module.id })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {module.image ? 'Modifier l\'image' : 'Ajouter une image'}
                </button>
                <button onClick={onDelete}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Supprimer</button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditingImage && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <ImageUpload
            label=""
            value={module.image}
            onChange={(url) => onImageChange(url)}
            aspectRatio="wide"
          />
          <button onClick={() => dispatch({ type: 'stopImageEdit' })}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700">Fermer</button>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-lg">
              Aucune séance dans ce module.
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard key={session.id} session={session}
                isOpen={expandedSession === session.id}
                modules={modules}
                onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                onEdit={() => onEditSession(session)}
                onOpenContent={() => onOpenContent(session)}
                onDelete={() => { if (confirm(`Supprimer la séance « ${session.titre} » ?`)) onDeleteSession(session.id); }}
                onMoveToModule={(moduleId) => onMoveSession(session.id, moduleId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SessionCard({ session, muted, isOpen, modules, onToggle, onEdit, onDelete, onOpenContent, onMoveToModule }: {
  session: Session;
  muted?: boolean;
  isOpen: boolean;
  modules?: CourseModule[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenContent: () => void;
  onMoveToModule?: (moduleId: string | null) => void;
}) {
  const status = sessionStatus(session.date);
  const meta = STATUS_META[status];
  const hasContent = Array.isArray(session.content) && session.content.length > 0;
  const shortDate = formatShortDate(session.date).split(' ');

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${isOpen ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'} ${muted ? 'opacity-90' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left">
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
          <span className="text-[10px] uppercase text-gray-400 font-medium">{shortDate[1]}</span>
          <span className="text-lg font-bold text-gray-800 leading-none">{shortDate[0]}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {formatDuration(session.duree)}</span>
            {session.class?.nom && (
              <span className="text-xs text-gray-400 flex items-center gap-1"><Users size={11} /> {session.class.nom}</span>
            )}
          </div>
          <h4 className="font-medium text-gray-900 truncate">{session.titre}</h4>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {session.image && !isOpen && (
            <img src={session.image} alt="" className="h-8 w-12 object-cover rounded-md border border-gray-100" />
          )}
          {hasContent && (
            <span className="text-xs text-indigo-500 flex items-center gap-1" title="Contenu pédagogique rédigé"><FileText size={12} /></span>
          )}
          {(session._count?.resources ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1"><Paperclip size={12} /> {session._count?.resources}</span>
          )}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          {session.image && (
            <div className="rounded-xl overflow-hidden h-36 w-full">
              <img src={session.image} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Calendar size={12} /> {formatSessionDate(session.date)}
          </div>

          <DetailField icon={<Target size={14} className="text-indigo-600" />} label="Objectifs" value={session.objectifs} />
          {session.contenu && <DetailField icon={<FileText size={14} className="text-indigo-600" />} label="Contenu" value={session.contenu} />}

          {modules && onMoveToModule && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Déplacer vers</label>
              <select value={session.moduleId || ''} onChange={(e) => onMoveToModule(e.target.value || null)}
                className="w-full sm:w-64 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sans module</option>
                {modules.map((module) => <option key={module.id} value={module.id}>{module.titre}</option>)}
              </select>
            </div>
          )}

          <ResourceManager sessionId={session.id} />

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={onOpenContent}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-indigo-900 hover:bg-indigo-800 rounded-lg px-3 py-1.5 transition-colors">
              <FileText size={14} /> {hasContent ? 'Ouvrir le contenu' : 'Rédiger le contenu'}
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-700 border border-gray-200 hover:border-indigo-200 rounded-lg px-3 py-1.5 transition-colors">
              <Pencil size={14} /> Modifier
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg px-3 py-1.5 transition-colors">
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {icon} {label}
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ResourceManager({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ titre: string; type: Resource['type']; url: string }>({ titre: '', type: 'LIEN', url: '' });

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['resources', sessionId],
    queryFn: () => api.get('/resources', { params: { sessionId } }).then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/resources', { ...form, sessionId, url: form.url || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setForm({ titre: '', type: 'LIEN', url: '' });
      setAdding(false);
    },
  });
  const remove = useMutation({
    mutationFn: (rid: string) => api.delete(`/resources/${rid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resources', sessionId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        <Paperclip size={14} className="text-indigo-600" /> Ressources
      </div>

      {resources.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm group">
              <span className="text-indigo-600">{resourceIcon(resource.type)}</span>
              {resource.url ? (
                <a href={resource.url} target="_blank" rel="noreferrer"
                  className="text-gray-700 hover:text-indigo-700 hover:underline flex items-center gap-1 min-w-0">
                  <span className="truncate">{resource.titre}</span>
                  <ExternalLink size={11} className="shrink-0" />
                </a>
              ) : (
                <span className="text-gray-700 truncate">{resource.titre}</span>
              )}
              <button onClick={() => remove.mutate(resource.id)}
                className="ml-auto text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex gap-2">
            <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
              placeholder="Titre de la ressource" autoFocus
              className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Resource['type'] })}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {RESOURCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://... (lien vers la ressource)"
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex gap-2">
            <button onClick={() => create.mutate()} disabled={!form.titre || create.isPending}
              className="bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-800 disabled:opacity-50">
              Ajouter
            </button>
            <button onClick={() => { setAdding(false); setForm({ titre: '', type: 'LIEN', url: '' }); }}
              className="text-gray-500 text-sm hover:text-gray-700 px-2">Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:text-indigo-900 font-medium">
          <Plus size={14} /> Ajouter une ressource
        </button>
      )}
    </div>
  );
}
