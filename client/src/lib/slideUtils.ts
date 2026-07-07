export type AnyRecord = Record<string, unknown>;

export interface RawBlock {
  id?: string;
  type?: string;
  props?: AnyRecord;
  content?: unknown;
  children?: RawBlock[];
}

export interface BlockStyle {
  color?: string;
  backgroundColor?: string;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export interface EditableBlock {
  id: string;
  type: string;
  props: AnyRecord;
  content: unknown;
  children: RawBlock[];
  style: BlockStyle;
  editableText: string;
}

export interface EditableSlide {
  id: string;
  blocks: EditableBlock[];
  slideStyle: {
    backgroundColor?: string;
  };
}

export const FONT_SIZE_MAP: Record<NonNullable<BlockStyle['fontSize']>, string> = {
  sm: '0.75em',
  base: '1em',
  lg: '1.25em',
  xl: '1.5em',
  '2xl': '2em',
};

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getStringProp(props: AnyRecord, key: string) {
  const value = props[key];
  return typeof value === 'string' ? value : '';
}

function extractEditableText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .map((item) => {
      if (!isRecord(item)) return '';
      if (item.type === 'text') return typeof item.text === 'string' ? item.text : '';
      if (item.type === 'link') return extractEditableText(item.content);
      return '';
    })
    .join('');
}

function extractStyle(props: AnyRecord): BlockStyle {
  const styleValue = props.style;
  const rawStyle = isRecord(styleValue) ? styleValue : props;
  const style: BlockStyle = {};

  if (typeof rawStyle.color === 'string') style.color = rawStyle.color;
  if (typeof rawStyle.backgroundColor === 'string') style.backgroundColor = rawStyle.backgroundColor;
  if (['sm', 'base', 'lg', 'xl', '2xl'].includes(String(rawStyle.fontSize))) {
    style.fontSize = rawStyle.fontSize as BlockStyle['fontSize'];
  }
  if (rawStyle.fontWeight === 'normal' || rawStyle.fontWeight === 'bold') style.fontWeight = rawStyle.fontWeight;
  if (rawStyle.fontStyle === 'normal' || rawStyle.fontStyle === 'italic') style.fontStyle = rawStyle.fontStyle;
  if (rawStyle.textAlign === 'left' || rawStyle.textAlign === 'center' || rawStyle.textAlign === 'right') {
    style.textAlign = rawStyle.textAlign;
  }

  return style;
}

function blockToEditableBlock(block: RawBlock, index: number, existing?: EditableBlock): EditableBlock {
  const props = block.props ?? {};
  let editableText = extractEditableText(block.content);

  if (!editableText) {
    if (block.type === 'mermaid') editableText = getStringProp(props, 'code');
    if (block.type === 'image') editableText = getStringProp(props, 'caption') || getStringProp(props, 'url');
    if (block.type === 'linkCard') editableText = getStringProp(props, 'title') || getStringProp(props, 'url');
  }

  return {
    id: block.id || `block-${index + 1}`,
    type: block.type || 'paragraph',
    props,
    content: block.content,
    children: block.children ?? [],
    style: existing?.style ?? extractStyle(props),
    editableText: existing?.editableText ?? editableText,
  };
}

function isSlideHeading(block: RawBlock) {
  if (block.type !== 'heading') return false;
  const level = Number(block.props?.level ?? 1);
  return level <= 2;
}

export function groupBlocksIntoEditableSlides(rawContent: unknown, existing?: EditableSlide[]): EditableSlide[] {
  const blocks = Array.isArray(rawContent) ? (rawContent as RawBlock[]) : [];
  const existingBlocks = new Map<string, EditableBlock>();
  existing?.forEach((slide) => slide.blocks.forEach((block) => existingBlocks.set(block.id, block)));

  const slides: EditableSlide[] = [];
  let currentBlocks: EditableBlock[] = [];

  blocks.forEach((block, index) => {
    if (isSlideHeading(block) && currentBlocks.length > 0) {
      const existingSlide = existing?.[slides.length];
      const bg = currentBlocks[0]?.props?._slideBackground;
      slides.push({
        id: existingSlide?.id ?? `slide-${slides.length + 1}`,
        blocks: currentBlocks,
        slideStyle: existingSlide?.slideStyle ?? (typeof bg === 'string' ? { backgroundColor: bg } : {}),
      });
      currentBlocks = [];
    }

    currentBlocks.push(blockToEditableBlock(block, index, block.id ? existingBlocks.get(block.id) : undefined));
  });

  if (currentBlocks.length > 0) {
    const existingSlide = existing?.[slides.length];
    const bg = currentBlocks[0]?.props?._slideBackground;
    slides.push({
      id: existingSlide?.id ?? `slide-${slides.length + 1}`,
      blocks: currentBlocks,
      slideStyle: existingSlide?.slideStyle ?? (typeof bg === 'string' ? { backgroundColor: bg } : {}),
    });
  }

  return slides.length > 0 ? slides : [{ id: existing?.[0]?.id ?? 'slide-1', blocks: [], slideStyle: existing?.[0]?.slideStyle ?? {} }];
}

export function editableSlidesToBlocks(slides: EditableSlide[]): RawBlock[] {
  const blocks: RawBlock[] = [];

  slides.forEach((slide) => {
    slide.blocks.forEach((block, blockIndex) => {
      const props: AnyRecord = { ...block.props };

      if (Object.keys(block.style).length > 0) props.style = block.style;

      if (blockIndex === 0 && slide.slideStyle.backgroundColor) {
        props._slideBackground = slide.slideStyle.backgroundColor;
      } else {
        delete props._slideBackground;
      }

      let content: unknown;
      if (block.content !== undefined) {
        content = block.content;
      } else if (block.editableText) {
        content = [{ type: 'text', text: block.editableText }];
      } else {
        content = [];
      }

      blocks.push({ id: block.id, type: block.type, props, content, children: block.children });
    });
  });

  return blocks;
}

export function getAutoContrastColor(hexBg: string) {
  const normalized = hexBg.trim().replace('#', '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return '#000000';

  const channels = [0, 2, 4].map((start) => {
    const srgb = parseInt(fullHex.slice(start, start + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? '#000000' : '#ffffff';
}
