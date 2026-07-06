import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, Users, Calendar, Check, Loader2, Target } from 'lucide-react';
import api from '../services/api';
import type { Session } from '../types';
import SessionEditor from '../components/SessionEditor';
import { formatSessionDate, formatDuration, sessionStatus, STATUS_META } from '../lib/sessionUtils';
import type { TeacBlock, TeacPartialBlock } from '../lib/blocknoteSchema';

type SaveState = 'idle' | 'saving' | 'saved';

export default function SessionEditorPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data),
    enabled: !!sessionId,
    staleTime: Infinity, // don't refetch & remount the editor while editing
  });

  const save = useMutation({
    mutationFn: (content: TeacBlock[]) => api.put(`/sessions/${sessionId}`, { content }),
    onMutate: () => setSaveState('saving'),
    onSuccess: () => {
      setSaveState('saved');
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
    },
  });

  const handleChange = useCallback((blocks: TeacBlock[]) => {
    setSaveState('saving');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save.mutate(blocks), 1200);
  }, [save]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }
  if (!session) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="mb-4">Séance introuvable.</p>
        <button onClick={() => navigate(`/courses/${courseId}`)} className="text-indigo-700 font-medium hover:underline">← Retour au cours</button>
      </div>
    );
  }

  const status = sessionStatus(session.date);
  const meta = STATUS_META[status];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(`/courses/${courseId}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> {session.course?.nom || 'Cours'}
          </button>
          <SaveIndicator state={saveState} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Session meta */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{session.titre}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatSessionDate(session.date)}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDuration(session.duree)}</span>
            {session.class?.nom && <span className="flex items-center gap-1.5"><Users size={14} /> {session.class.nom}</span>}
          </div>
        </div>

        {session.objectifs && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">
              <Target size={13} /> Objectifs
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.objectifs}</p>
          </div>
        )}

        {/* Rich content editor */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-6">
          <SessionEditor
            initialContent={(Array.isArray(session.content) ? session.content : undefined) as TeacPartialBlock[] | undefined}
            onChange={handleChange}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Tapez « / » pour insérer un bloc : titre, liste, code, image, vidéo, diagramme Mermaid… ou glissez un fichier.
        </p>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') return <span className="flex items-center gap-1.5 text-xs text-gray-400"><Loader2 size={13} className="animate-spin" /> Enregistrement…</span>;
  if (state === 'saved') return <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check size={13} /> Enregistré</span>;
  return <span className="text-xs text-gray-300">Modifications enregistrées automatiquement</span>;
}
