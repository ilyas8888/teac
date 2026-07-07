import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Clock, Users, Calendar, Check, Loader2, Target, Presentation, Download, Settings2, Copy } from 'lucide-react';
import api from '../services/api';
import type { Session } from '../types';
import SessionEditor from '../components/SessionEditor';
import { formatSessionDate, formatDuration, sessionStatus, STATUS_META } from '../lib/sessionUtils';
import type { TeacBlock, TeacPartialBlock } from '../lib/blocknoteSchema';

type SaveState = 'idle' | 'saving' | 'saved';

const THEMES = [
  { value: 'white', label: 'Blanc' },
  { value: 'black', label: 'Noir' },
  { value: 'moon', label: 'Lune' },
  { value: 'sky', label: 'Ciel' },
  { value: 'league', label: 'Ligue' },
  { value: 'beige', label: 'Beige' },
] as const;

const TRANSITIONS = [
  { value: 'slide', label: 'Glisser' },
  { value: 'fade', label: 'Fondu' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'none', label: 'Aucune' },
] as const;

interface PresentOpts {
  theme: typeof THEMES[number]['value'];
  transition: typeof TRANSITIONS[number]['value'];
  showMeta: boolean;
}

export default function SessionEditorPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const navigate = useNavigate();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [presentOpts, setPresentOpts] = useState<PresentOpts>({ theme: 'white', transition: 'slide', showMeta: true });
  const [showPresentPanel, setShowPresentPanel] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentPanelRef = useRef<HTMLDivElement | null>(null);
  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';

  const buildPresentUrl = useCallback((download = false) => {
    const params = new URLSearchParams();
    if (presentOpts.theme !== 'white') params.set('theme', presentOpts.theme);
    if (presentOpts.transition !== 'slide') params.set('transition', presentOpts.transition);
    if (!presentOpts.showMeta) params.set('meta', '0');
    if (download) params.set('download', '1');

    const query = params.toString();
    const baseUrl = `${apiBase}/present/${sessionId}`;
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [apiBase, presentOpts, sessionId]);

  useEffect(() => {
    if (!showPresentPanel) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (!presentPanelRef.current?.contains(event.target as Node)) {
        setShowPresentPanel(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showPresentPanel]);

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
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} />
            {session && (
              <div className="relative flex items-center gap-2" ref={presentPanelRef}>
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
                  href={buildPresentUrl()}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Presentation size={15} /> Présenter
                </a>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:border-gray-300 hover:text-gray-900"
                  onClick={() => setShowPresentPanel((visible) => !visible)}
                  aria-label="Options de présentation"
                  aria-expanded={showPresentPanel}
                >
                  <Settings2 size={15} />
                </button>
                <a
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                  href={buildPresentUrl(true)}
                  download
                >
                  <Download size={15} /> HTML
                </a>
                {showPresentPanel && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg">
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Thème</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {THEMES.map((theme) => (
                          <button
                            key={theme.value}
                            type="button"
                            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                              presentOpts.theme === theme.value
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                            }`}
                            onClick={() => setPresentOpts((opts) => ({ ...opts, theme: theme.value }))}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Transition</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {TRANSITIONS.map((transition) => (
                          <button
                            key={transition.value}
                            type="button"
                            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                              presentOpts.transition === transition.value
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
                            }`}
                            onClick={() => setPresentOpts((opts) => ({ ...opts, transition: transition.value }))}
                          >
                            {transition.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={presentOpts.showMeta}
                        onChange={(event) => setPresentOpts((opts) => ({ ...opts, showMeta: event.target.checked }))}
                      />
                      Afficher les infos de séance
                    </label>
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                      onClick={() => navigator.clipboard.writeText(buildPresentUrl())}
                    >
                      <Copy size={14} /> Copier le lien
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
