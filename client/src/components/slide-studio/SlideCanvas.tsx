import { useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  X,
} from 'lucide-react';
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
  onDeleteBlock: (blockId: string) => void;
  onInsertImage: (url: string) => void;
  onInsertLink: (url: string, title?: string) => void;
  onInsertBlock: (blockType: string, props?: Record<string, unknown>) => void;
  onUpdateSlideStyle: (backgroundColor?: string) => void;
  onSelectSlide: (index: number) => void;
}

const insertSections = [
  {
    label: 'Texte',
    items: [
      { label: 'Heading 1', icon: <Heading1 size={15} />, blockType: 'heading', props: { level: 1 } },
      { label: 'Heading 2', icon: <Heading2 size={15} />, blockType: 'heading', props: { level: 2 } },
      { label: 'Heading 3', icon: <Heading3 size={15} />, blockType: 'heading', props: { level: 3 } },
      { label: 'Paragraph', icon: <Pilcrow size={15} />, blockType: 'paragraph' },
    ],
  },
  {
    label: 'Listes',
    items: [
      { label: 'Bullet List', icon: <List size={15} />, blockType: 'bulletListItem' },
      { label: 'Numbered List', icon: <ListOrdered size={15} />, blockType: 'numberedListItem' },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Image', icon: <ImageIcon size={15} />, popover: 'image' },
      { label: 'Lien', icon: <LinkIcon size={15} />, popover: 'link' },
    ],
  },
  {
    label: 'Autres',
    items: [
      { label: 'Code Block', icon: <Code2 size={15} />, blockType: 'codeBlock' },
      { label: 'Divider', icon: <Minus size={15} />, blockType: 'divider' },
      { label: 'Quote', icon: <Quote size={15} />, blockType: 'quote' },
    ],
  },
] satisfies InsertSection[];

interface InsertSection {
  label: string;
  items: InsertItem[];
}

type InsertItem =
  | { label: string; icon: ReactNode; blockType: string; props?: Record<string, unknown>; popover?: never }
  | { label: string; icon: ReactNode; popover: 'image' | 'link'; blockType?: never; props?: never };

export default function SlideCanvas(props: SlideCanvasProps) {
  const { slide, slideIndex, totalSlides, selectedBlockId, onSelectBlock, onMoveUp, onMoveDown, onMoveToPrev, onMoveToNext, onDeleteBlock, onInsertImage, onInsertLink, onInsertBlock, onUpdateSlideStyle, onSelectSlide } = props;
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const backgroundColor = slide.slideStyle.backgroundColor || '#ffffff';
  const color = getAutoContrastColor(backgroundColor);

  function handleInsertItem(item: InsertItem) {
    setShowInsertMenu(false);
    if (item.popover === 'image') {
      setShowImageUpload(true);
      setShowLinkForm(false);
      return;
    }
    if (item.popover === 'link') {
      setShowLinkForm(true);
      setShowImageUpload(false);
      return;
    }
    onInsertBlock(item.blockType, item.props);
  }

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
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInsertMenu((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
            >
              <Plus size={15} /> Inserer <ChevronDown size={14} />
            </button>
            {showInsertMenu && (
              <div className="absolute right-0 top-10 z-30 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
                {insertSections.map((section, index) => (
                  <InsertMenuSection key={section.label} label={section.label} isLast={index === insertSections.length - 1}>
                    {section.items.map((item) => (
                      <InsertMenuItem key={item.label} icon={item.icon} label={item.label} onClick={() => handleInsertItem(item)} />
                    ))}
                  </InsertMenuSection>
                ))}
              </div>
            )}
            {showLinkForm && (
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const url = linkUrl.trim();
                  const title = linkTitle.trim();
                  if (!url) return;
                  onInsertLink(url, title || undefined);
                  setLinkUrl('');
                  setLinkTitle('');
                  setShowLinkForm(false);
                }}
              >
                <input
                  type="url"
                  required
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="h-8 w-48 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(event) => setLinkTitle(event.target.value)}
                  placeholder="Titre"
                  className="h-8 w-36 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none transition focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-purple-700"
                >
                  Insérer
                </button>
              </form>
            )}
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
                    onDelete={() => onDeleteBlock(block.id)}
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

function InsertMenuSection({ label, children, isLast = false }: { label: string; children: ReactNode; isLast?: boolean }) {
  return (
    <div className={isLast ? '' : 'mb-1 border-b border-gray-100 pb-1'}>
      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      {children}
    </div>
  );
}

function InsertMenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-purple-50 hover:text-purple-800"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
