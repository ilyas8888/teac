import type { EditableSlide } from '../../lib/slideUtils';
import { getAutoContrastColor } from '../../lib/slideUtils';

interface SlideNavigatorProps {
  slides: EditableSlide[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAddSlide: () => void;
}

export default function SlideNavigator({ slides, selectedIndex, onSelect, onAddSlide }: SlideNavigatorProps) {
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Slides</h2>
        <button
          type="button"
          onClick={onAddSlide}
          title="Ajouter une slide"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-lg leading-none text-gray-500 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
        >
          +
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {slides.map((slide, index) => {
          const backgroundColor = slide.slideStyle.backgroundColor || '#ffffff';
          const color = getAutoContrastColor(backgroundColor);
          const previewText = slide.blocks.map((block) => block.editableText).find(Boolean) || 'Slide vide';

          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => onSelect(index)}
              className={`w-full rounded-lg border p-2 text-left transition ${
                selectedIndex === index
                  ? 'border-purple-500 ring-2 ring-purple-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="aspect-video rounded-md border border-black/10 p-2 shadow-sm"
                style={{ backgroundColor, color }}
              >
                <div className="text-[10px] font-semibold opacity-70">{index + 1}</div>
                <div className="mt-1 line-clamp-3 text-[11px] leading-snug">{previewText}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAddSlide}
        className="mt-3 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
      >
        + Nouvelle slide
      </button>
    </aside>
  );
}
