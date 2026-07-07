import { useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import EditableBlockItem from './EditableBlockItem';
import ImageUpload from '../ImageUpload';
import type { EditableSlide } from '../../lib/slideUtils';
import { getAutoContrastColor } from '../../lib/slideUtils';

interface SlideCanvasProps {
  slide: EditableSlide;
  slideIndex: number;
  totalSlides: number;
  selectedBlockId?: string;
  onSelectBlock: (blockId: string) => void;
  onMoveUp: (blockId: string) => void;
  onMoveDown: (blockId: string) => void;
  onMoveToPrev: (blockId: string) => void;
  onMoveToNext: (blockId: string) => void;
  onInsertImage: (url: string) => void;
  onUpdateSlideStyle: (backgroundColor?: string) => void;
  onSelectSlide: (index: number) => void;
}

export default function SlideCanvas(props: SlideCanvasProps) {
  const { slide, slideIndex, totalSlides, selectedBlockId, onSelectBlock, onMoveUp, onMoveDown, onMoveToPrev, onMoveToNext, onInsertImage, onUpdateSlideStyle, onSelectSlide } = props;
  const [showImageUpload, setShowImageUpload] = useState(false);
  const backgroundColor = slide.slideStyle.backgroundColor || '#ffffff';
  const color = getAutoContrastColor(backgroundColor);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-gray-100">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button type="button" className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" disabled={slideIndex === 0} title="Slide précédente" onClick={() => onSelectSlide(slideIndex - 1)}>
            <ChevronLeft size={18} />
          </button>
          <span>Slide {slideIndex + 1} / {totalSlides}</span>
          <button type="button" className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-40" disabled={slideIndex >= totalSlides - 1} title="Slide suivante" onClick={() => onSelectSlide(slideIndex + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowImageUpload((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
            >
              <ImageIcon size={15} /> Image
            </button>
            {showImageUpload && (
              <div className="absolute right-0 top-10 z-20 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Ajouter une image</h3>
                  <button
                    type="button"
                    onClick={() => setShowImageUpload(false)}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Fermer"
                  >
                    <X size={15} />
                  </button>
                </div>
                <ImageUpload
                  value={null}
                  label=""
                  aspectRatio="video"
                  onChange={(url) => {
                    if (!url) return;
                    onInsertImage(url);
                    setShowImageUpload(false);
                  }}
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
            Fond
            <input
              type="color"
              value={backgroundColor}
              onChange={(event) => onUpdateSlideStyle(event.target.value)}
              className="h-8 w-10 rounded border border-gray-200 bg-white p-1"
            />
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div
            className="aspect-video w-full overflow-y-auto rounded-lg border border-gray-300 p-10 shadow-sm"
            style={{ backgroundColor, color }}
          >
            <div className="flex min-h-full flex-col justify-start gap-3">
              {slide.blocks.length === 0 ? (
                <div className="text-center text-sm opacity-60">Aucun bloc sur cette slide.</div>
              ) : (
                slide.blocks.map((block, index) => (
                  <EditableBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    isFirst={index === 0}
                    isLast={index === slide.blocks.length - 1}
                    slideIndex={slideIndex}
                    totalSlides={totalSlides}
                    onSelect={() => onSelectBlock(block.id)}
                    onMoveUp={() => onMoveUp(block.id)}
                    onMoveDown={() => onMoveDown(block.id)}
                    onMoveToPrev={() => onMoveToPrev(block.id)}
                    onMoveToNext={() => onMoveToNext(block.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
