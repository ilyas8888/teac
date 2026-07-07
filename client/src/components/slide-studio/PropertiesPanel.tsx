import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BlockStyle, EditableBlock, EditableSlide } from '../../lib/slideUtils';
import { getAutoContrastColor } from '../../lib/slideUtils';

interface PropertiesPanelProps {
  selectedBlock?: EditableBlock;
  selectedSlide: EditableSlide;
  onUpdateBlockText: (text: string) => void;
  onUpdateBlockStyle: (style: BlockStyle) => void;
  onUpdateSlideStyle: (backgroundColor?: string) => void;
}

const FONT_SIZES: NonNullable<BlockStyle['fontSize']>[] = ['sm', 'base', 'lg', 'xl', '2xl'];
const FONT_LABELS: Record<NonNullable<BlockStyle['fontSize']>, string> = {
  sm: 'Sm',
  base: 'Base',
  lg: 'Lg',
  xl: 'Xl',
  '2xl': '2Xl',
};

export default function PropertiesPanel({ selectedBlock, selectedSlide, onUpdateBlockText, onUpdateBlockStyle, onUpdateSlideStyle }: PropertiesPanelProps) {
  const slideBg = selectedSlide.slideStyle.backgroundColor || '#ffffff';

  return (
    <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">Propriétés</h2>
      {selectedBlock ? (
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Texte</span>
            <textarea
              value={selectedBlock.editableText}
              onChange={(event) => onUpdateBlockText(event.target.value)}
              className="min-h-32 w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Texte" value={selectedBlock.style.color || '#111827'} onChange={(color) => onUpdateBlockStyle({ color })} />
            <ColorField label="Fond" value={selectedBlock.style.backgroundColor || '#ffffff'} onChange={(backgroundColor) => onUpdateBlockStyle({ backgroundColor })} />
          </div>

          <Section title="Taille">
            <div className="grid grid-cols-5 gap-1">
              {FONT_SIZES.map((fontSize) => (
                <button
                  key={fontSize}
                  type="button"
                  onClick={() => onUpdateBlockStyle({ fontSize })}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium ${selectedBlock.style.fontSize === fontSize ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  {FONT_LABELS[fontSize]}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Style">
            <div className="flex gap-2">
              <IconButton active={selectedBlock.style.fontWeight === 'bold'} label="Gras" onClick={() => onUpdateBlockStyle({ fontWeight: selectedBlock.style.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold size={16} /></IconButton>
              <IconButton active={selectedBlock.style.fontStyle === 'italic'} label="Italique" onClick={() => onUpdateBlockStyle({ fontStyle: selectedBlock.style.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={16} /></IconButton>
            </div>
          </Section>

          <Section title="Alignement">
            <div className="flex gap-2">
              <IconButton active={selectedBlock.style.textAlign === 'left'} label="Aligner à gauche" onClick={() => onUpdateBlockStyle({ textAlign: 'left' })}><AlignLeft size={16} /></IconButton>
              <IconButton active={selectedBlock.style.textAlign === 'center'} label="Centrer" onClick={() => onUpdateBlockStyle({ textAlign: 'center' })}><AlignCenter size={16} /></IconButton>
              <IconButton active={selectedBlock.style.textAlign === 'right'} label="Aligner à droite" onClick={() => onUpdateBlockStyle({ textAlign: 'right' })}><AlignRight size={16} /></IconButton>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => onUpdateBlockStyle({ color: undefined, backgroundColor: undefined, fontSize: undefined, fontWeight: undefined, fontStyle: undefined, textAlign: undefined })}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            <RotateCcw size={15} /> Réinitialiser le style
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <ColorField label="Fond de slide" value={slideBg} onChange={(backgroundColor) => onUpdateSlideStyle(backgroundColor)} />
          <div className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Contraste auto</div>
            <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: slideBg, color: getAutoContrastColor(slideBg) }}>
              {getAutoContrastColor(slideBg)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSlideStyle(undefined)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
          >
            Retirer le fond
          </button>
        </div>
      )}
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>
      {children}
    </section>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white p-1"
      />
    </label>
  );
}

function IconButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${active ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
    >
      {children}
    </button>
  );
}
