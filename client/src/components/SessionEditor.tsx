import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

interface SessionEditorProps {
  initialContent?: PartialBlock[];
  editable?: boolean;
  onChange?: (blocks: Block[]) => void;
}

/**
 * Notion-style block editor for a session's rich content.
 * Stores/emits BlockNote's document (array of blocks) as plain JSON.
 */
export default function SessionEditor({ initialContent, editable = true, onChange }: SessionEditorProps) {
  const editor = useCreateBlockNote({
    // BlockNote requires at least one block; undefined => a single empty paragraph
    initialContent: initialContent && initialContent.length > 0 ? initialContent : undefined,
  });

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme="light"
      onChange={() => onChange?.(editor.document)}
    />
  );
}
