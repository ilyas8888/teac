import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, Eye, Save } from 'lucide-react';
import SessionEditor from '../components/SessionEditor';
import SlideNavigator from '../components/slide-studio/SlideNavigator';
import { uploadToCloudinary } from '../lib/cloudinary';
import { downloadRevealHtml, openRevealPreview, type PresentOptions } from '../lib/slideExporter';
import { groupBlocksIntoEditableSlides, type RawBlock } from '../lib/slideUtils';
import api from '../services/api';
import type { Session } from '../types';
import type { TeacBlock, TeacPartialBlock } from '../lib/blocknoteSchema';

interface SessionEditorWithUploadProps {
  initialContent?: TeacPartialBlock[];
  editable?: boolean;
  slideBackground?: string;
  onChange?: (blocks: TeacBlock[]) => void;
  uploadFile?: (file: File) => Promise<string>;
}

const StudioSessionEditor = SessionEditor as ComponentType<SessionEditorWithUploadProps>;
const exportThemes: PresentOptions['theme'][] = ['white', 'black', 'night', 'moon', 'solarized', 'sky'];
const exportTransitions: PresentOptions['transition'][] = ['slide', 'fade', 'zoom', 'convex', 'concave', 'none'];

const THEME_CANVAS: Record<PresentOptions['theme'], { slide: string; text: string; border: string }> = {
  white:     { slide: '#ffffff', text: '#222222', border: '#c0c0c0' },
  black:     { slide: '#191919', text: '#ffffff', border: '#333333' },
  night:     { slide: '#1c1e20', text: '#eeeeee', border: '#2e3032' },
  moon:      { slide: '#002b36', text: '#93a1a1', border: '#0a3340' },
  solarized: { slide: '#fdf6e3', text: '#657b83', border: '#c8b660' },
  sky:       { slide: '#add9e4', text: '#333333', border: '#5aa0b4' },
};

function isSlideHeading(block: RawBlock) {
  if (block.type !== 'heading') return false;
  const level = Number(block.props?.level ?? 1);
  return level <= 2;
}

function getSlideStartIndexes(content: TeacPartialBlock[]) {
  const starts: number[] = [];

  content.forEach((block, index) => {
    const rawBlock = block as RawBlock;
    if ((index === 0 && starts.length === 0) || (isSlideHeading(rawBlock) && index > 0)) {
      starts.push(index);
    }
  });

  return starts.length > 0 ? starts : [0];
}

function createSlideHeading(slideNumber: number): TeacPartialBlock {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `slide-${Date.now()}`,
    type: 'heading',
    props: { level: 1 },
    content: [{ type: 'text', text: `Nouvelle slide ${slideNumber}`, styles: {} }],
  } as TeacPartialBlock;
}

function createBlockId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function duplicateBlockWithNewIds(block: TeacPartialBlock): TeacPartialBlock {
  const rawBlock = block as RawBlock;
  return {
    ...block,
    id: createBlockId(),
    children: rawBlock.children?.map((child) => duplicateBlockWithNewIds(child as TeacPartialBlock)) ?? [],
  } as TeacPartialBlock;
}

function getBlockBackground(block: TeacPartialBlock | undefined) {
  const props = (block as RawBlock | undefined)?.props;
  return typeof props?._slideBackground === 'string' ? props._slideBackground : '#ffffff';
}

export default function SlideStudioPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [content, setContent] = useState<TeacPartialBlock[] | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [exportOptions, setExportOptions] = useState<Pick<PresentOptions, 'transition' | 'theme' | 'controls' | 'progress' | 'slideNumber'>>({
    transition: 'slide',
    theme: 'white',
    controls: true,
    progress: true,
    slideNumber: true,
  });

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((response) => response.data),
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!session) return;
    setContent((Array.isArray(session.content) ? session.content : []) as TeacPartialBlock[]);
    setSelectedSlideIndex(0);
  }, [session]);

  const slides = useMemo(() => groupBlocksIntoEditableSlides(content ?? []), [content]);
  const slideStartIndexes = useMemo(() => getSlideStartIndexes(content ?? []), [content]);
  const currentSlideBlocks = useMemo(() => {
    const blocks = content ?? [];
    const starts = slideStartIndexes;
    const start = starts[selectedSlideIndex] ?? 0;
    const end = starts[selectedSlideIndex + 1] ?? blocks.length;
    return blocks.slice(start, end) as TeacPartialBlock[];
  }, [content, selectedSlideIndex, slideStartIndexes]);
  const selectedSlide = slides[selectedSlideIndex] ?? slides[0];
  const activeSlideStart = slideStartIndexes[selectedSlideIndex] ?? 0;
  const activeBackground = getBlockBackground(content?.[activeSlideStart]);
  const themeColors = THEME_CANVAS[exportOptions.theme];
  const slideBackground = activeBackground !== '#ffffff' ? activeBackground : themeColors.slide;

  const save = useMutation({
    mutationFn: () => api.put(`/sessions/${sessionId}`, { content: content ?? [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
    },
  });

  const handleAddSlide = () => {
    setContent((current) => {
      const blocks = current ?? [];
      const starts = getSlideStartIndexes(blocks);
      const insertIndex = starts[selectedSlideIndex + 1] ?? blocks.length;
      const next = [...blocks];
      next.splice(insertIndex, 0, createSlideHeading(starts.length + 1));
      return next;
    });
    setSelectedSlideIndex((index) => index + 1);
  };

  const handleInsertBefore = (index: number) => {
    setContent((current) => {
      const blocks = current ?? [];
      const starts = getSlideStartIndexes(blocks);
      const insertIndex = starts[index] ?? blocks.length;
      const next = [...blocks];
      next.splice(insertIndex, 0, createSlideHeading(starts.length + 1));
      return next;
    });
    setSelectedSlideIndex(index);
  };

  const handleDeleteSlide = (index: number) => {
    setContent((current) => {
      const blocks = current ?? [];
      const starts = getSlideStartIndexes(blocks);
      if (starts.length <= 1) return blocks;

      const start = starts[index] ?? 0;
      const end = starts[index + 1] ?? blocks.length;
      return [...blocks.slice(0, start), ...blocks.slice(end)];
    });
    setSelectedSlideIndex((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
  };

  const handleDuplicateSlide = (index: number) => {
    setContent((current) => {
      const blocks = current ?? [];
      const starts = getSlideStartIndexes(blocks);
      const start = starts[index] ?? 0;
      const end = starts[index + 1] ?? blocks.length;
      const duplicatedBlocks = blocks.slice(start, end).map(duplicateBlockWithNewIds);
      const next = [...blocks];
      next.splice(end, 0, ...duplicatedBlocks);
      return next;
    });
    setSelectedSlideIndex(index + 1);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    setContent((current) => {
      const blocks = current ?? [];
      const starts = getSlideStartIndexes(blocks);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= starts.length) return blocks;

      const firstIndex = Math.min(index, targetIndex);
      const secondIndex = Math.max(index, targetIndex);
      const firstStart = starts[firstIndex] ?? 0;
      const firstEnd = starts[firstIndex + 1] ?? blocks.length;
      const secondStart = starts[secondIndex] ?? firstEnd;
      const secondEnd = starts[secondIndex + 1] ?? blocks.length;
      const firstSlide = blocks.slice(firstStart, firstEnd);
      const betweenSlides = blocks.slice(firstEnd, secondStart);
      const secondSlide = blocks.slice(secondStart, secondEnd);

      return [
        ...blocks.slice(0, firstStart),
        ...secondSlide,
        ...betweenSlides,
        ...firstSlide,
        ...blocks.slice(secondEnd),
      ];
    });
    setSelectedSlideIndex(direction === 'up' ? index - 1 : index + 1);
  };

  const handleSlideChange = (newBlocks: TeacBlock[]) => {
    setContent((prev) => {
      const blocks = prev ?? [];
      const starts = getSlideStartIndexes(blocks);
      const start = starts[selectedSlideIndex] ?? 0;
      const end = starts[selectedSlideIndex + 1] ?? blocks.length;
      return [
        ...blocks.slice(0, start),
        ...(newBlocks as TeacPartialBlock[]),
        ...blocks.slice(end),
      ];
    });
  };

  const handleBackgroundChange = (backgroundColor: string) => {
    setContent((current) => {
      const blocks = current ?? [];
      if (blocks.length === 0) {
        return [{ ...createSlideHeading(1), props: { level: 1, _slideBackground: backgroundColor } }];
      }

      const starts = getSlideStartIndexes(blocks);
      const targetIndex = starts[selectedSlideIndex] ?? 0;

      return blocks.map((block, index) => {
        if (index !== targetIndex) return block;
        const rawBlock = block as RawBlock;
        return {
          ...block,
          props: {
            ...(rawBlock.props ?? {}),
            _slideBackground: backgroundColor,
          },
        } as TeacPartialBlock;
      });
    });
  };

  if (isLoading || content === null) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" /></div>;
  }

  if (!session || !selectedSlide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center text-gray-500">
        <div>
          <p className="mb-4">Seance introuvable.</p>
          <button type="button" onClick={() => navigate(`/courses/${courseId}`)} className="font-medium text-purple-700 hover:underline">Retour au cours</button>
        </div>
      </div>
    );
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
          <p className="truncate text-sm font-semibold text-gray-900">{session.titre}</p>
          <p className="truncate text-xs text-gray-500">Slide Studio</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openRevealPreview(session, slides, exportOptions)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            <Eye size={15} /> Apercu
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {save.isSuccess && !save.isPending ? <><Check size={15} /> Enregistre</> : save.isPending ? <><Save size={15} /> Sauvegarde...</> : <><Save size={15} /> Enregistrer</>}
          </button>
          <button
            type="button"
            onClick={() => downloadRevealHtml(session, slides, exportOptions)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            <Download size={15} /> Telecharger
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_260px]">
        <SlideNavigator
          slides={slides}
          selectedIndex={selectedSlideIndex}
          onSelect={setSelectedSlideIndex}
          onAddSlide={handleAddSlide}
          onInsertBefore={handleInsertBefore}
          onDeleteSlide={handleDeleteSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onMoveSlide={handleMoveSlide}
        />

        <main
          className="min-h-0 overflow-y-auto px-8 py-6"
        >
          <div
            id="studio-slide-canvas"
            className="mx-auto rounded-lg shadow-md transition-colors duration-200"
            style={{
              aspectRatio: '1100 / 700',
              width: '100%',
              maxWidth: '100%',
              backgroundColor: slideBackground,
              color: themeColors.text,
              border: `1px solid ${themeColors.border}`,
              overflow: 'hidden',
            }}
          >
            <StudioSessionEditor
              key={`slide-${selectedSlideIndex}-${slideBackground}`}
              initialContent={currentSlideBlocks}
              slideBackground={slideBackground}
              onChange={handleSlideChange}
              uploadFile={uploadToCloudinary}
            />
          </div>
        </main>

        <aside className="border-l border-gray-200 bg-white p-4">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Slide active</h2>
          <label className="block text-sm font-medium text-gray-700" htmlFor="slide-background">
            Arriere-plan
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="slide-background"
              type="color"
              value={activeBackground}
              onChange={(event) => handleBackgroundChange(event.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white p-1"
            />
            <span className="font-mono text-xs text-gray-500">{activeBackground}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-400">
            La couleur est stockee dans <span className="font-mono">_slideBackground</span> sur le premier bloc de la slide.
          </p>

          <div className="mt-8 border-t border-gray-200 pt-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Export</h2>

            <label className="block text-sm font-medium text-gray-700" htmlFor="export-theme">
              Theme
            </label>
            <select
              id="export-theme"
              value={exportOptions.theme}
              onChange={(event) => setExportOptions((current) => ({ ...current, theme: event.target.value as PresentOptions['theme'] }))}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {exportThemes.map((theme) => (
                <option key={theme} value={theme}>{theme}</option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-medium text-gray-700" htmlFor="export-transition">
              Transition
            </label>
            <select
              id="export-transition"
              value={exportOptions.transition}
              onChange={(event) => setExportOptions((current) => ({ ...current, transition: event.target.value as PresentOptions['transition'] }))}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {exportTransitions.map((transition) => (
                <option key={transition} value={transition}>{transition}</option>
              ))}
            </select>

            <div className="mt-4 space-y-3">
              {([
                ['controls', 'Controles'],
                ['progress', 'Progression'],
                ['slideNumber', 'Numero de slide'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={exportOptions[key]}
                    onChange={(event) => setExportOptions((current) => ({ ...current, [key]: event.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
