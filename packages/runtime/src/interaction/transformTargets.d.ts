import type { DocumentNode, EditorDocument } from '@venus/document-core';
/**
 * Resolve leaf shape targets for resize handles from a mixed single/multi/group
 * selection. Group selections expand to non-group descendants, while direct
 * child duplicates under selected parents are skipped.
 */
export declare function collectResizeTransformTargets(selectedNodes: DocumentNode[], document: EditorDocument): DocumentNode[];
