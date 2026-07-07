import { useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Eye, Save, Check } from 'lucide-react';
import SlideNavigator from '../components/slide-studio/SlideNavigator';
import SlideCanvas from '../components/slide-studio/SlideCanvas';
import PropertiesPanel from '../components/slide-studio/PropertiesPanel';
import { downloadRevealHtml, openRevealPreview } from '../lib/slideExporter';
import type { BlockStyle, EditableBlock, EditableSlide } from '../lib/slideUtils';
import { groupBlocksIntoEditableSlides, editableSlidesToBlocks } from '../lib/slideUtils';
import api from '../services/api';
import type { Session } from '../types';

interface SlideStudioState {
  slides: EditableSlide[];
  selectedSlideIndex: number;
  selectedBlockId?: string;
}

type SlideStudioAction =
  | { type: 'INIT'; slides: EditableSlide[] }
  | { type: 'SELECT_SLIDE'; index: number }
  | { type: 'SELECT_BLOCK'; blockId?: string }
  | { type: 'UPDATE_BLOCK_TEXT'; text: string }
  | { type: 'UPDATE_BLOCK_STYLE'; style: BlockStyle }
  | { type: 'UPDATE_SLIDE_STYLE'; backgroundColor?: string }
  | { type: 'INSERT_BLOCK'; blockType: string; props?: Record<string, unknown> }
  | { type: 'INSERT_IMAGE_BLOCK'; url: string }
  | { type: 'INSERT_LINK_BLOCK'; url: string; title?: string }
  | { type: 'MOVE_BLOCK_UP'; blockId: string }
  | { type: 'MOVE_BLOCK_DOWN'; blockId: string }
  | { type: 'MOVE_BLOCK_TO_SLIDE'; blockId: string; direction: -1 | 1 };

const initialState: SlideStudioState = {
  slides: [],
  selectedSlideIndex: 0,
  selectedBlockId: undefined,
};

function reducer(state: SlideStudioState, action: SlideStudioAction): SlideStudioState {
  if (action.type === 'INIT') {
    return {
      slides: action.slides,
      selectedSlideIndex: 0,
      selectedBlockId: action.slides[0]?.blocks[0]?.id,
    };
  }

  if (action.type === 'SELECT_SLIDE') {
    const slide = state.slides[action.index];
    return { ...state, selectedSlideIndex: action.index, selectedBlockId: slide?.blocks[0]?.id };
  }

  if (action.type === 'SELECT_BLOCK') return { ...state, selectedBlockId: action.blockId };

  const slideIndex = state.selectedSlideIndex;
  const currentSlide = state.slides[slideIndex];
  if (!currentSlide) return state;

  if (action.type === 'UPDATE_SLIDE_STYLE') {
    return updateSlide(state, slideIndex, {
      ...currentSlide,
      slideStyle: { backgroundColor: action.backgroundColor },
    });
  }

  if (action.type === 'UPDATE_BLOCK_TEXT' || action.type === 'UPDATE_BLOCK_STYLE') {
    return updateSlide(state, slideIndex, {
      ...currentSlide,
      blocks: currentSlide.blocks.map((block) => {
        if (block.id !== state.selectedBlockId) return block;
        if (action.type === 'UPDATE_BLOCK_TEXT') return { ...block, editableText: action.text };
        return { ...block, style: { ...block.style, ...action.style } };
      }),
    });
  }

  if (action.type === 'INSERT_BLOCK') {
    const block = createEditableBlock(action.blockType, action.props);

    return {
      ...updateSlide(state, slideIndex, {
        ...currentSlide,
        blocks: [...currentSlide.blocks, block],
      }),
      selectedBlockId: block.id,
    };
  }

  if (action.type === 'INSERT_IMAGE_BLOCK') {
    const imageBlock = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `image-${Date.now()}`,
      type: 'image',
      props: { url: action.url },
      content: undefined,
      children: [],
      style: { textAlign: 'center' as const },
      editableText: '',
    };

    return {
      ...updateSlide(state, slideIndex, {
        ...currentSlide,
        blocks: [...currentSlide.blocks, imageBlock],
      }),
      selectedBlockId: imageBlock.id,
    };
  }

  if (action.type === 'INSERT_LINK_BLOCK') {
    const linkBlock: EditableBlock = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `link-${Date.now()}`,
      type: 'linkCard',
      props: { url: action.url, title: action.title ?? '' },
      content: undefined,
      children: [],
      style: {},
      editableText: action.title || action.url,
    };

    return {
      ...updateSlide(state, slideIndex, {
        ...currentSlide,
        blocks: [...currentSlide.blocks, linkBlock],
      }),
      selectedBlockId: linkBlock.id,
    };
  }

  if (action.type === 'MOVE_BLOCK_UP' || action.type === 'MOVE_BLOCK_DOWN') {
    const blockIndex = currentSlide.blocks.findIndex((block) => block.id === action.blockId);
    const targetIndex = action.type === 'MOVE_BLOCK_UP' ? blockIndex - 1 : blockIndex + 1;
    if (blockIndex < 0 || targetIndex < 0 || targetIndex >= currentSlide.blocks.length) return state;

    const blocks = [...currentSlide.blocks];
    const [movedBlock] = blocks.splice(blockIndex, 1);
    blocks.splice(targetIndex, 0, movedBlock);
    return updateSlide(state, slideIndex, { ...currentSlide, blocks });
  }

  if (action.type === 'MOVE_BLOCK_TO_SLIDE') {
    const targetSlideIndex = slideIndex + action.direction;
    const targetSlide = state.slides[targetSlideIndex];
    if (!targetSlide) return state;

    const block = currentSlide.blocks.find((item) => item.id === action.blockId);
    if (!block) return state;

    const slides = state.slides.map((slide, index) => {
      if (index === slideIndex) return { ...slide, blocks: slide.blocks.filter((item) => item.id !== action.blockId) };
      if (index === targetSlideIndex) {
        return {
          ...slide,
          blocks: action.direction < 0 ? [...slide.blocks, block] : [block, ...slide.blocks],
        };
      }
      return slide;
    });

    return { slides, selectedSlideIndex: targetSlideIndex, selectedBlockId: action.blockId };
  }

  return state;
}

function updateSlide(state: SlideStudioState, slideIndex: number, slide: EditableSlide): SlideStudioState {
  return {
    ...state,
    slides: state.slides.map((item, index) => (index === slideIndex ? slide : item)),
  };
}

function createEditableBlock(blockType: string, props: Record<string, unknown> = {}): EditableBlock {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${blockType}-${Date.now()}`,
    type: blockType,
    props,
    content: undefined,
    children: [],
    style: defaultStyleForBlock(blockType),
    editableText: defaultTextForBlock(blockType, props),
  };
}

function defaultStyleForBlock(blockType: string): BlockStyle {
  if (blockType === 'heading') return { fontWeight: 'bold' };
  if (blockType === 'quote') return { fontStyle: 'italic' };
  return {};
}

function defaultTextForBlock(blockType: string, props: Record<string, unknown>) {
  if (blockType === 'heading') return `Heading ${Number(props.level ?? 1)}`;
  if (blockType === 'paragraph') return 'Nouveau paragraphe';
  if (blockType === 'bulletListItem') return 'Nouvel element';
  if (blockType === 'numberedListItem') return 'Nouvel element';
  if (blockType === 'codeBlock') return 'console.log("Hello world");';
  if (blockType === 'quote') return 'Citation';
  return '';
}

export default function SlideStudioPage() {
  const { courseId, sessionId } = useParams<{ courseId: string; sessionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [savedOk, setSavedOk] = useState(false);

  const { data: session, isLoading } = useQuery<Session>({
    queryKey: ['session', sessionId],
    queryFn: () => api.get(`/sessions/${sessionId}`).then((response) => response.data),
    enabled: !!sessionId,
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: () => api.put(`/sessions/${sessionId}`, { content: editableSlidesToBlocks(state.slides) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    },
  });

  useEffect(() => {
    if (!session) return;
    dispatch({ type: 'INIT', slides: groupBlocksIntoEditableSlides(session.content, state.slides) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const selectedSlide = state.slides[state.selectedSlideIndex] ?? state.slides[0];
  const selectedBlock = selectedSlide?.blocks.find((block) => block.id === state.selectedBlockId);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600" /></div>;
  }

  if (!session || !selectedSlide) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-center text-gray-500">
        <div>
          <p className="mb-4">Séance introuvable.</p>
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
            onClick={() => openRevealPreview(session, state.slides)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            <Eye size={15} /> Aperçu
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${savedOk ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {savedOk ? <><Check size={15} /> Enregistré</> : save.isPending ? <><Save size={15} /> Sauvegarde…</> : <><Save size={15} /> Enregistrer</>}
          </button>
          <button
            type="button"
            onClick={() => downloadRevealHtml(session, state.slides)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
          >
            <Download size={15} /> Télécharger
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)_280px]">
        <SlideNavigator
          slides={state.slides}
          selectedIndex={state.selectedSlideIndex}
          onSelect={(index) => dispatch({ type: 'SELECT_SLIDE', index })}
        />
        <SlideCanvas
          slide={selectedSlide}
          slideIndex={state.selectedSlideIndex}
          totalSlides={state.slides.length}
          selectedBlockId={state.selectedBlockId}
          onSelectBlock={(blockId) => dispatch({ type: 'SELECT_BLOCK', blockId })}
          onMoveUp={(blockId) => dispatch({ type: 'MOVE_BLOCK_UP', blockId })}
          onMoveDown={(blockId) => dispatch({ type: 'MOVE_BLOCK_DOWN', blockId })}
          onMoveToPrev={(blockId) => dispatch({ type: 'MOVE_BLOCK_TO_SLIDE', blockId, direction: -1 })}
          onMoveToNext={(blockId) => dispatch({ type: 'MOVE_BLOCK_TO_SLIDE', blockId, direction: 1 })}
          onInsertImage={(url) => dispatch({ type: 'INSERT_IMAGE_BLOCK', url })}
          onInsertLink={(url, title) => dispatch({ type: 'INSERT_LINK_BLOCK', url, title })}
          onInsertBlock={(blockType, props) => dispatch({ type: 'INSERT_BLOCK', blockType, props })}
          onUpdateSlideStyle={(backgroundColor) => dispatch({ type: 'UPDATE_SLIDE_STYLE', backgroundColor })}
          onSelectSlide={(index) => dispatch({ type: 'SELECT_SLIDE', index })}
        />
        <PropertiesPanel
          selectedBlock={selectedBlock}
          selectedSlide={selectedSlide}
          onUpdateBlockText={(text) => dispatch({ type: 'UPDATE_BLOCK_TEXT', text })}
          onUpdateBlockStyle={(style) => dispatch({ type: 'UPDATE_BLOCK_STYLE', style })}
          onUpdateSlideStyle={(backgroundColor) => dispatch({ type: 'UPDATE_SLIDE_STYLE', backgroundColor })}
        />
      </div>
    </div>
  );
}
