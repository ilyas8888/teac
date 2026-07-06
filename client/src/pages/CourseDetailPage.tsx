import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, Layers, Clock, Users, Calendar, Target, FileText,
  Trash2, Pencil, ChevronDown, X, Link2, File, Image, Video, Paperclip,
  ExternalLink, BookOpen,
} from 'lucide-react';
import api from '../services/api';
import type { Course, Session, Class, Resource } from '../types';
import { courseTheme } from '../lib/courseTheme';
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

const emptySession = { titre: '', objectifs: '', contenu: '', duree: 120, date: '', classId: '' };

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [form, setForm] = useState(emptySession);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then((r) => r.data),
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
    qc.invalidateQueries({ queryKey: ['course', id] });
    qc.invalidateQueries({ queryKey: ['courses'] });
  };

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/sessions', { ...data, courseId: id, duree: Number(data.duree) }),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const update = useMutation({
    mutationFn: ({ sid, data }: { sid: string; data: typeof form }) =>
      api.put(`/sessions/${sid}`, { ...data, duree: Number(data.duree) }),
    onSuccess: () => { invalidate(); closeForm(); },
  });
  const remove = useMutation({
    mutationFn: (sid: string) => api.delete(`/sessions/${sid}`),
    onSuccess: invalidate,
  });

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(emptySession); };
  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptySession, classId: classes[0]?.id || '' });
    setShowForm(true);
  };
  const openEdit = (s: Session) => {
    setEditing(s);
    setForm({
      titre: s.titre,
      objectifs: s.objectifs,
      contenu: s.contenu || '',
      duree: s.duree,
      date: s.date.slice(0, 16),
      classId: s.classId,
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
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duree, 0);
  const pending = create.isPending || update.isPending;

  // Sort: upcoming/today first (chronological), then past (most recent first)
  const upcoming = sessions
    .filter((s) => sessionStatus(s.date) !== 'past')
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const past = sessions
    .filter((s) => sessionStatus(s.date) === 'past')
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/courses')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft size={16} /> Cours
      </button>

      {/* Course header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className={`h-2 bg-gradient-to-r ${theme.gradient}`} />
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`${theme.bg} p-3 rounded-xl`}>
                <BookOpen size={24} className={theme.text} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course.nom}</h1>
                <span className={`inline-block text-xs font-medium ${theme.text} ${theme.bg} px-2 py-0.5 rounded-full mt-1`}>
                  {course.matiere}
                </span>
                {course.description && <p className="text-sm text-gray-500 mt-3 max-w-2xl">{course.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mt-6 pt-5 border-t border-gray-100 text-sm">
            <Metric icon={<Layers size={16} className="text-indigo-600" />} value={sessions.length} label="séances" />
            <Metric icon={<Clock size={16} className="text-emerald-600" />} value={formatDuration(totalMinutes)} label="au total" />
            <Metric icon={<Calendar size={16} className="text-amber-600" />} value={upcoming.length} label="à venir" />
          </div>
        </div>
      </div>

      {/* Sessions section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Séances</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800 transition-colors">
          <Plus size={16} /> Nouvelle séance
        </button>
      </div>

      {sessionsLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="mb-4">Aucune séance planifiée pour ce cours.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-800">
            <Plus size={16} /> Planifier une séance
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <TimelineGroup title="À venir & aujourd'hui" sessions={upcoming}
              expanded={expanded} setExpanded={setExpanded} onEdit={openEdit} onDelete={remove.mutate} />
          )}
          {past.length > 0 && (
            <TimelineGroup title="Séances passées" sessions={past} muted
              expanded={expanded} setExpanded={setExpanded} onEdit={openEdit} onDelete={remove.mutate} />
          )}
        </div>
      )}

      {/* Session form modal */}
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

              <div className="grid grid-cols-3 gap-4">
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
                    <option value="">Choisir…</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}{c.groupe ? ` — ${c.groupe}` : ''}</option>
                    ))}
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
                  placeholder="Ce que les apprenants sauront faire à la fin de la séance…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" /> Contenu / déroulé
                </label>
                <textarea value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Plan de la séance, activités, points clés…" />
              </div>
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

function TimelineGroup({ title, sessions, muted, expanded, setExpanded, onEdit, onDelete }: {
  title: string;
  sessions: Session[];
  muted?: boolean;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onEdit: (s: Session) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</h3>
      <div className="space-y-3">
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} muted={muted}
            isOpen={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
            onEdit={() => onEdit(s)}
            onDelete={() => { if (confirm(`Supprimer la séance « ${s.titre} » ?`)) onDelete(s.id); }} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({ session, muted, isOpen, onToggle, onEdit, onDelete }: {
  session: Session;
  muted?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = sessionStatus(session.date);
  const meta = STATUS_META[status];
  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${isOpen ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'} ${muted ? 'opacity-90' : ''}`}>
      <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left">
        {/* Date pill */}
        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-gray-50 border border-gray-100 shrink-0">
          <span className="text-[10px] uppercase text-gray-400 font-medium">{formatShortDate(session.date).split(' ')[1]}</span>
          <span className="text-lg font-bold text-gray-800 leading-none">{formatShortDate(session.date).split(' ')[0]}</span>
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

        <div className="flex items-center gap-1 shrink-0">
          {(session._count?.resources ?? 0) > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1 mr-1"><Paperclip size={12} /> {session._count?.resources}</span>
          )}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Calendar size={12} /> {formatSessionDate(session.date)}
          </div>

          <Field icon={<Target size={14} className="text-indigo-600" />} label="Objectifs" value={session.objectifs} />
          {session.contenu && <Field icon={<FileText size={14} className="text-indigo-600" />} label="Contenu" value={session.contenu} />}

          <ResourceManager sessionId={session.id} />

          <div className="flex gap-2 pt-2">
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

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm group">
              <span className="text-indigo-600">{resourceIcon(r.type)}</span>
              {r.url ? (
                <a href={r.url} target="_blank" rel="noreferrer"
                  className="text-gray-700 hover:text-indigo-700 hover:underline flex items-center gap-1 min-w-0">
                  <span className="truncate">{r.titre}</span>
                  <ExternalLink size={11} className="shrink-0" />
                </a>
              ) : (
                <span className="text-gray-700 truncate">{r.titre}</span>
              )}
              <button onClick={() => remove.mutate(r.id)}
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
              {RESOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://… (lien vers la ressource)"
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
