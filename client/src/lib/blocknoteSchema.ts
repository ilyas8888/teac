import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { LinkCardBlock } from '../components/blocks/LinkCardBlock';
import { MermaidBlock } from '../components/blocks/MermaidBlock';

export const teacBlockNoteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    linkCard: LinkCardBlock,
    mermaid: MermaidBlock,
  },
});

export type TeacBlock = typeof teacBlockNoteSchema.Block;
export type TeacPartialBlock = typeof teacBlockNoteSchema.PartialBlock;
