import { ArrowDown, ArrowLeftToLine, ArrowRightToLine, ArrowUp, Code2, ExternalLink, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { EditableBlock } from '../../lib/slideUtils';
import { FONT_SIZE_MAP } from '../../lib/slideUtils';

interface EditableBlockItemProps {
  block: EditableBlock;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  slideIndex: number;
  totalSlides: number;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToPrev: () => void;
  onMoveToNext: () => void;
  onDelete: () => void;
}

function stringProp(block: EditableBlock, key: string) {
  const value = block.props[key];
  return typeof value === 'string' ? value : '';
}

function blockStyle(block: EditableBlock): CSSProperties {
  return {
    color: block.style.color,
    backgroundColor: block.style.backgroundColor,
    fontSize: block.style.fontSize ? FONT_SIZE_MAP[block.style.fontSize] : undefined,
    fontWeight: block.style.fontWeight,
    fontStyle: block.style.fontStyle,
    textAlign: block.style.textAlign,
  };
}

export default function EditableBlockItem(props: EditableBlockItemProps) {
  const { block, isSelected, isFirst, isLast, slideIndex, totalSlides, onSelect, onMoveUp, onMoveDown, onMoveToPrev, onMoveToNext, onDelete } = props;
  const commonClass = 'min-w-0 rounded-lg px-3 py-2 transition';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect();
      }}
      className={`group relative cursor-pointer border ${
        isSelected ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-100' : 'border-transparent hover:border-purple-200 hover:bg-white/70'
      }`}
    >
      <BlockContent block={block} className={commonClass} style={blockStyle(block)} />
      <div className={`absolute right-2 top-2 flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <MoveButton label="Monter" disabled={isFirst} onClick={onMoveUp}><ArrowUp size={13} /></MoveButton>
        <MoveButton label="Descendre" disabled={isLast} onClick={onMoveDown}><ArrowDown size={13} /></MoveButton>
        <MoveButton label="Slide précédente" disabled={slideIndex === 0} onClick={onMoveToPrev}><ArrowLeftToLine size={13} /></MoveButton>
        <MoveButton label="Slide suivante" disabled={slideIndex >= totalSlides - 1} onClick={onMoveToNext}><ArrowRightToLine size={13} /></MoveButton>
        <MoveButton label="Supprimer" disabled={false} onClick={onDelete}><Trash2 size={13} /></MoveButton>
      </div>
    </div>
  );
}

function MoveButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function BlockContent({ block, className, style }: { block: EditableBlock; className: string; style: CSSProperties }) {
  const text = block.editableText || 'Bloc vide';

  if (block.type === 'heading') {
    const level = Number(block.props.level ?? 1);
    const HeadingTag = level <= 1 ? 'h1' : level === 2 ? 'h2' : 'h3';
    const sizeClass = level <= 1 ? 'text-4xl' : level === 2 ? 'text-3xl' : 'text-2xl';
    return <HeadingTag className={`${className} ${sizeClass} font-bold text-gray-950`} style={style}>{text}</HeadingTag>;
  }

  if (block.type === 'bulletListItem') return <div className={`${className} flex gap-2 text-xl`} style={style}><span>•</span><span>{text}</span></div>;
  if (block.type === 'numberedListItem') return <div className={`${className} flex gap-2 text-xl`} style={style}><span>1.</span><span>{text}</span></div>;
  if (block.type === 'codeBlock') return <pre className={`${className} overflow-x-auto bg-gray-950 font-mono text-sm text-gray-100`} style={style}><code>{text}</code></pre>;
  if (block.type === 'mermaid') return <pre className={`${className} overflow-x-auto border border-indigo-100 bg-indigo-50 font-mono text-sm text-indigo-900`} style={style}>{text}</pre>;
  if (block.type === 'divider') return <hr className="my-3 border-t border-gray-300" style={style} />;
  if (block.type === 'quote') return <blockquote className={`${className} border-l-4 border-purple-300 pl-4 text-xl italic leading-relaxed text-gray-700`} style={style}>{text}</blockquote>;

  if (block.type === 'image') {
    const url = stringProp(block, 'url');
    return (
      <figure className={className} style={style}>
        {url ? <img src={url} alt={text} className="max-h-72 w-full rounded-lg object-contain" /> : <div className="flex h-32 items-center justify-center rounded-lg bg-gray-100 text-gray-400"><ImageIcon size={28} /></div>}
        {text && <figcaption className="mt-2 text-center text-sm text-gray-500">{text}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'linkCard') {
    const url = stringProp(block, 'url');
    return (
      <div className={`${className} flex items-center gap-3 border border-gray-200 bg-white`} style={style}>
        <ExternalLink className="shrink-0 text-purple-500" size={24} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{text || url}</div>
          {url && <div className="truncate text-sm text-gray-500">{url}</div>}
        </div>
      </div>
    );
  }

  if (block.type === 'paragraph') return <p className={`${className} text-xl leading-relaxed`} style={style}>{text}</p>;

  return <div className={`${className} flex gap-2 text-lg`} style={style}><Code2 size={18} className="mt-1 shrink-0 text-gray-400" />{text}</div>;
}
