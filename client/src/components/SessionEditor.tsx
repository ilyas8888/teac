import { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core/extensions';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from '@blocknote/react';
import { BlockNoteView, lightDefaultTheme, type Theme } from '@blocknote/mantine';
import { GitBranch, Link2 } from 'lucide-react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { uploadToCloudinary } from '../lib/cloudinary';
import {
  teacBlockNoteSchema,
  type TeacBlock,
  type TeacPartialBlock,
} from '../lib/blocknoteSchema';

interface SessionEditorProps {
  initialContent?: TeacPartialBlock[];
  editable?: boolean;
  slideBackground?: string;
  onChange?: (blocks: TeacBlock[]) => void;
}

function parseHexColor(color: string) {
  const hex = color.trim().replace(/^#/, '');
  const normalized =
    hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function linearizeChannel(channel: number) {
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function isDarkColor(color: string) {
  const rgb = parseHexColor(color);
  if (!rgb) return false;

  const luminance =
    0.2126 * linearizeChannel(rgb.r) +
    0.7152 * linearizeChannel(rgb.g) +
    0.0722 * linearizeChannel(rgb.b);

  return luminance < 0.179;
}

function getBlockNoteTheme(slideBackground?: string): 'light' | 'dark' | Theme {
  if (!slideBackground) return 'light';
  if (isDarkColor(slideBackground)) return 'dark';

  return {
    ...lightDefaultTheme,
    colors: {
      ...lightDefaultTheme.colors,
      editor: {
        ...lightDefaultTheme.colors.editor,
        background: slideBackground,
      },
    },
  };
}

/**
 * Notion-style block editor for a session's rich content.
 * Stores/emits BlockNote's document (array of blocks) as plain JSON.
 */
export default function SessionEditor({ initialContent, editable = true, slideBackground, onChange }: SessionEditorProps) {
  const editor = useCreateBlockNote({
    schema: teacBlockNoteSchema,
    // BlockNote requires at least one block; undefined => a single empty paragraph
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    // Direct signed upload to Cloudinary — enables image/video/file blocks
    uploadFile: editable ? uploadToCloudinary : undefined,
  });
  const editorTheme = useMemo(() => getBlockNoteTheme(slideBackground), [slideBackground]);

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme={editorTheme}
      slashMenu={false}
      onChange={() => onChange?.(editor.document)}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...getDefaultReactSlashMenuItems(editor),
              {
                key: 'mermaid',
                title: 'Diagramme (Mermaid)',
                subtext: 'Insérer un diagramme Mermaid',
                aliases: ['diagramme', 'mermaid', 'flowchart', 'sequence'],
                group: 'Média',
                icon: <GitBranch size={18} />,
                onItemClick: () =>
                  insertOrUpdateBlockForSlashMenu(editor, {
                    type: 'mermaid',
                  }),
              },
              {
                key: 'linkCard',
                title: 'Lien / Embed',
                subtext: 'Video code slides PDF ou carte',
                aliases: ['lien', 'link', 'carte', 'url', 'preview'],
                group: 'Média',
                icon: <Link2 size={18} />,
                onItemClick: () =>
                  insertOrUpdateBlockForSlashMenu(editor, {
                    type: 'linkCard',
                  }),
              },
            ],
            query,
          )
        }
      />
    </BlockNoteView>
  );
}

