import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Download, ExternalLink, Upload } from 'lucide-react';
import api from '../services/api';
import { uploadToCloudinary } from '../lib/cloudinary';
import type { Session } from '../types';

const THEMES = ['white', 'black', 'moon', 'sky', 'league', 'beige'] as const;
const TRANSITIONS = ['slide', 'fade', 'zoom', 'none'] as const;
const SPEEDS = ['default', 'fast', 'slow'] as const;
const FONTS = ['inter', 'montserrat', 'roboto', 'lato', 'merriweather'] as const;

type Theme = typeof THEMES[number];
type Transition = typeof TRANSITIONS[number];
type Speed = typeof SPEEDS[number];
type Font = typeof FONTS[number];

interface CustomizeOpts {
  theme: Theme;
  transition: Transition;
  speed: Speed;
  font: Font;
  accent: string;
  logo: string;
  footer: string;
  ratio: '169' | '43';
  showNumbers: boolean;
  showProgress: boolean;
  showMeta: boolean;
}

const DEFAULT_OPTS: CustomizeOpts = {
  theme: 'white',
  transition: 'slide',
  speed: 'default',
  font: 'inter',
  accent: '#4338ca',
  logo: '',
  footer: '',
  ratio: '169',
  showNumbers: false,
  showProgress: true,
  showMeta: true,
};

const THEME_LABELS: Record<Theme, string> = {
  white: 'Blanc',
  black: 'Noir',
  moon: 'Lune',
  sky: 'Ciel',
  league: 'League',
  beige: 'Beige',
};

const TRANSITION_LABELS: Record<Transition, string> = {
  slide: 'Glisser',
  fade: 'Fondu',
  zoom: 'Zoom',
  none: 'Aucune',
};

const SPEED_LABELS: Record<Speed, string> = {
  default: 'Normal',
  fast: 'Rapide',
  slow: 'Lent',
};

const FONT_LABELS: Record<Font, string> = {
  inter: 'Inter',
  montserrat: 'Montserrat',
  roboto: 'Roboto',
  lato: 'Lato',
  merriweather: 'Merriweather',
};

export default function PresentationCustomizePage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const navigate = useNavigate();
  const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001/api';
  const [opts, setOpts] = useState<CustomizeOpts>(DEFAULT_OPTS);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((r) => r.data),
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  const buildUrl = useMemo(() => (overrides: Partial<CustomizeOpts> = {}, download = false) => {
    const values = { ...opts, ...overrides };
    const params = new URLSearchParams();

    if (values.theme !== DEFAULT_OPTS.theme) params.set('theme', values.theme);
    if (values.transition !== DEFAULT_OPTS.transition) params.set('transition', values.transition);
    if (values.speed !== DEFAULT_OPTS.speed) params.set('speed', values.speed);
    if (values.font !== DEFAULT_OPTS.font) params.set('font', values.font);
    if (values.accent !== DEFAULT_OPTS.accent) params.set('accent', values.accent);
    if (values.logo !== DEFAULT_OPTS.logo) params.set('logo', values.logo);
    if (values.footer !== DEFAULT_OPTS.footer) params.set('footer', values.footer);
    if (values.ratio !== DEFAULT_OPTS.ratio) params.set('ratio', values.ratio);
    if (values.showNumbers !== DEFAULT_OPTS.showNumbers) params.set('numbers', values.showNumbers ? '1' : '0');
    if (values.showProgress !== DEFAULT_OPTS.showProgress) params.set('progress', values.showProgress ? '1' : '0');
    if (values.showMeta !== DEFAULT_OPTS.showMeta) params.set('meta', values.showMeta ? '1' : '0');
    if (download) params.set('download', '1');

    const query = params.toString();
    const baseUrl = `${apiBase}/present/${sessionId}`;
    return query ? `${baseUrl}?${query}` : baseUrl;
  }, [apiBase, opts, sessionId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPreviewUrl(buildUrl()), 800);
    return () => window.clearTimeout(timeout);
  }, [buildUrl]);

  const updateOpts = (patch: Partial<CustomizeOpts>) => setOpts((current) => ({ ...current, ...patch }));

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingLogo(true);
    setUploadError('');
    try {
      const url = await uploadToCloudinary(file);
      updateOpts({ logo: url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload impossible');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="flex h-screen flex-col bg-gray-100">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <button
          type="button"
          onClick={() => navigate(`/courses/${courseId}/sessions/${sessionId}`)}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="min-w-0 px-4 text-center">
          <p className="truncate text-sm font-semibold text-gray-900">{session?.titre || 'Présentation'}</p>
          {session?.course?.nom && <p className="truncate text-xs text-gray-500">{session.course.nom}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(buildUrl())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            <Copy size={15} /> Copier le lien
          </button>
          <a
            href={buildUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <ExternalLink size={15} /> Ouvrir
          </a>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-gray-200 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <Section title="Apparence">
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((theme) => (
                  <OptionButton key={theme} active={opts.theme === theme} onClick={() => updateOpts({ theme })}>
                    {THEME_LABELS[theme]}
                  </OptionButton>
                ))}
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Accent</span>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={opts.accent}
                    onChange={(event) => updateOpts({ accent: event.target.value })}
                    className="h-10 w-14 rounded-md border border-gray-200 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={opts.accent}
                    onChange={(event) => updateOpts({ accent: event.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Police</span>
                <select
                  value={opts.font}
                  onChange={(event) => updateOpts({ font: event.target.value as Font })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
                >
                  {FONTS.map((font) => <option key={font} value={font}>{FONT_LABELS[font]}</option>)}
                </select>
              </label>
            </Section>

            <Section title="Identité">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Logo</span>
                <span className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm font-medium text-gray-600 transition hover:border-indigo-300 hover:text-indigo-700">
                  <Upload size={16} /> {isUploadingLogo ? 'Chargement…' : 'Ajouter un logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => handleLogoUpload(event.target.files?.[0])} />
                </span>
              </label>
              {opts.logo && (
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                  <img src={opts.logo} alt="Logo" className="h-10 w-10 rounded object-contain" />
                  <button type="button" onClick={() => updateOpts({ logo: '' })} className="text-xs font-medium text-gray-500 hover:text-gray-900">Retirer</button>
                </div>
              )}
              {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Pied de page</span>
                <input
                  type="text"
                  maxLength={100}
                  value={opts.footer}
                  onChange={(event) => updateOpts({ footer: event.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
                />
              </label>
            </Section>

            <Section title="Animation">
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS.map((transition) => (
                  <OptionButton key={transition} active={opts.transition === transition} onClick={() => updateOpts({ transition })}>
                    {TRANSITION_LABELS[transition]}
                  </OptionButton>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SPEEDS.map((speed) => (
                  <OptionButton key={speed} active={opts.speed === speed} onClick={() => updateOpts({ speed })}>
                    {SPEED_LABELS[speed]}
                  </OptionButton>
                ))}
              </div>
            </Section>

            <Section title="Format">
              <div className="grid grid-cols-2 gap-2">
                <OptionButton active={opts.ratio === '169'} onClick={() => updateOpts({ ratio: '169' })}>16:9</OptionButton>
                <OptionButton active={opts.ratio === '43'} onClick={() => updateOpts({ ratio: '43' })}>4:3</OptionButton>
              </div>
            </Section>

            <Section title="Affichage">
              <Checkbox label="Numéros de slides" checked={opts.showNumbers} onChange={(showNumbers) => updateOpts({ showNumbers })} />
              <Checkbox label="Barre de progression" checked={opts.showProgress} onChange={(showProgress) => updateOpts({ showProgress })} />
              <Checkbox label="Infos de séance" checked={opts.showMeta} onChange={(showMeta) => updateOpts({ showMeta })} />
            </Section>
          </div>

          <div className="border-t border-gray-200 p-5">
            <a
              href={buildUrl({}, true)}
              download
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <Download size={16} /> Télécharger HTML
            </a>
          </div>
        </aside>

        <section className="min-h-0 bg-gray-950 p-4">
          <iframe
            title="Aperçu de la présentation"
            src={previewUrl || buildUrl()}
            className="h-full w-full rounded-lg border border-gray-800 bg-white"
            allow="fullscreen; clipboard-write"
          />
        </section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 space-y-3">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      {label}
    </label>
  );
}
