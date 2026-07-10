import { useEffect, useRef, useState } from 'react';
import { Copy, MoreVertical, MoveDown, MoveUp, Plus, Trash2 } from 'lucide-react';
import { type EditableSlide, getAutoContrastColor } from '../../lib/slideUtils';

interface SlideNavigatorProps {
  slides: EditableSlide[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAddSlide: () => void;
  onInsertBefore: (index: number) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (index: number, direction: 'up' | 'down') => void;
}

export default function SlideNavigator({
  slides,
  selectedIndex,
  onSelect,
  onAddSlide,
  onInsertBefore,
  onDeleteSlide,
  onDuplicateSlide,
  onMoveSlide,
}: SlideNavigatorProps) {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenMenuIndex(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const runMenuAction = (action: () => void) => {
    action();
    setOpenMenuIndex(null);
  };

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Slides</h2>
        <button
          type="button"
          onClick={onAddSlide}
          title="Ajouter une slide"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
        >
          <Plus size={15} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {slides.map((slide, index) => {
          const backgroundColor = slide.slideStyle.backgroundColor || '#ffffff';
          const color = getAutoContrastColor(backgroundColor);
          const firstImageUrl = slide.blocks.find((block) => block.type === 'image')?.props?.url;
          const imageUrl = typeof firstImageUrl === 'string' ? firstImageUrl : undefined;
          const previewText = slide.blocks
            .filter((block) => block.type !== 'image')
            .map((block) => block.editableText)
            .find(Boolean) || (imageUrl ? '' : 'Slide vide');
          const isSelected = selectedIndex === index;
          const isMenuOpen = openMenuIndex === index;

          return (
            <div key={slide.id} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`w-full rounded-lg border p-2 text-left transition ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-100'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="aspect-video overflow-hidden rounded-md border border-black/10 shadow-sm"
                  style={{ backgroundColor, color }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="p-2">
                      <div className="text-[10px] font-semibold opacity-70">{index + 1}</div>
                      <div className="mt-1 line-clamp-3 text-[11px] leading-snug">{previewText}</div>
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuIndex(isMenuOpen ? null : index);
                }}
                title="Actions"
                className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-purple-50 hover:text-purple-700 ${
                  isMenuOpen ? 'text-purple-700' : 'text-gray-400'
                }`}
              >
                <MoreVertical size={14} />
              </button>

              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onInsertBefore(index))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <Plus size={14} /> Inserer avant
                  </button>
                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onInsertBefore(index + 1))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <Plus size={14} /> Inserer apres
                  </button>
                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onDuplicateSlide(index))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <Copy size={14} /> Dupliquer
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onMoveSlide(index, 'up'))}
                    disabled={index === 0}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                  >
                    <MoveUp size={14} /> Monter
                  </button>
                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onMoveSlide(index, 'down'))}
                    disabled={index === slides.length - 1}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                  >
                    <MoveDown size={14} /> Descendre
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() => runMenuAction(() => onDeleteSlide(index))}
                    disabled={slides.length <= 1}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-white"
                  >
                    <Trash2 size={14} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddSlide}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
      >
        <Plus size={15} /> Nouvelle slide
      </button>
    </aside>
  );
}
