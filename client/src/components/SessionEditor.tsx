import { useCreateBlockNote } from '@blocknote/react';
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core/extensions';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
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
  onChange?: (blocks: TeacBlock[]) => void;
}

/**
 * Notion-style block editor for a session's rich content.
 * Stores/emits BlockNote's document (array of blocks) as plain JSON.
 */
export default function SessionEditor({ initialContent, editable = true, onChange }: SessionEditorProps) {
  const editor = useCreateBlockNote({
    schema: teacBlockNoteSchema,
    // BlockNote requires at least one block; undefined => a single empty paragraph
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
    // Direct signed upload to Cloudinary — enables image/video/file blocks
    uploadFile: editable ? uploadToCloudinary : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme="light"
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

