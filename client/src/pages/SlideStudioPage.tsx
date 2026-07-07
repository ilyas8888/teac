import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Download, Eye, Save } from 'lucide-react';
import SessionEditor from '../components/SessionEditor';
import SlideNavigator from '../components/slide-studio/SlideNavigator';
import { uploadToCloudinary } from '../lib/cloudinary';
import { downloadRevealHtml, openRevealPreview } from '../lib/slideExporter';
import { groupBlocksIntoEditableSlides, type RawBlock } from '../lib/slideUtils';
import api from '../services/api';
import type { Session } from '../types';
import type { TeacBlock, TeacPartialBlock } from '../lib/blocknoteSchema';

interface SessionEditorWithUploadProps {
  initialContent?: TeacPartialBlock[];
  editable?: boolean;
  onChange?: (blocks: TeacBlock[]) => void;
  uploadFile?: (file: File) => Promise<string>;
}

const StudioSessionEditor = SessionEditor as ComponentType<SessionEditorWithUploadProps>;

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
  const selectedSlide = slides[selectedSlideIndex] ?? slides[0];
  const activeSlideStart = slideStartIndexes[selectedSlideIndex] ?? 0;
  const activeBackground = getBlockBackground(content?.[activeSlideStart]);
  const editorKey = useMemo(() => {
    const blocks = content ?? [];
    return blocks
      .map((block, index) => {
        const rawBlock = block as RawBlock;
        if (!isSlideHeading(rawBlock) && index !== 0) return '';
        return `${rawBlock.id ?? index}:${rawBlock.props?._slideBackground ?? ''}`;
      })
      .filter(Boolean)
      .join('|');
  }, [content]);

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
            onClick={() => openRevealPreview(session, slides)}
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
            onClick={() => downloadRevealHtml(session, slides)}
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
        />

        <main className="min-h-0 overflow-y-auto bg-white px-8 py-6">
          <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white py-6 shadow-sm">
            <StudioSessionEditor
              key={editorKey}
              initialContent={content}
              onChange={(blocks) => setContent(blocks as TeacPartialBlock[])}
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
        </aside>
      </div>
    </div>
  );
}
