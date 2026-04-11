import * as React from 'react';
import { type BoxTransformSource } from '@venus/document-core';
import type { TransformPreviewShape } from '@venus/runtime/interaction';
type TransformPreviewState<T extends TransformPreviewShape> = {
    shapes: T[];
} | null;
type DocumentShapeGeometry = BoxTransformSource & {
    id: string;
};
export declare function isTransformPreviewSynced<T extends TransformPreviewShape>(documentShapes: DocumentShapeGeometry[], preview: TransformPreviewState<T>): boolean;
export declare function useTransformPreviewCommitState<T extends TransformPreviewShape>(options: {
    documentShapes: DocumentShapeGeometry[];
}): {
    preview: TransformPreviewState<T>;
    previewRef: React.RefObject<TransformPreviewState<T>>;
    setPreview: (next: TransformPreviewState<T>) => void;
    clearPreview: () => void;
    markCommitPending: () => void;
};
export {};
