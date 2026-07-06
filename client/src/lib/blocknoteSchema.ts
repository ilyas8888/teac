import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { MermaidBlock } from '../components/blocks/MermaidBlock';

export const teacBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    mermaid: MermaidBlock,
  },
});

export type TeacBlock = typeof teacBlockNoteSchema.Block;
export type TeacPartialBlock = typeof teacBlockNoteSchema.PartialBlock;
