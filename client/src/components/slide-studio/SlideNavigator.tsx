import type { EditableSlide } from '../../lib/slideUtils';
import { getAutoContrastColor } from '../../lib/slideUtils';

interface SlideNavigatorProps {
  slides: EditableSlide[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function SlideNavigator({ slides, selectedIndex, onSelect }: SlideNavigatorProps) {
  return (
    <aside className="w-[200px] shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-3">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Slides</h2>
      <div className="space-y-2">
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
    </aside>
  );
}
