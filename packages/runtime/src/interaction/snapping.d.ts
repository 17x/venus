import { type EngineMoveSnapOptions, type EngineSnapAxis, type EngineSnapGuide, type EngineSnapGuideLine } from '@venus/engine';
import { type Mat3 } from '@venus/runtime';
import type { TransformPreview } from './transformSessionManager.ts';
export type SnapAxis = EngineSnapAxis;
export type SnapGuide = EngineSnapGuide;
export type MoveSnapOptions = EngineMoveSnapOptions;
export type SnapGuideLine = EngineSnapGuideLine;
/**
 * Runtime-interaction keeps the document-aware adapter for compatibility,
 * while engine owns the move-snap solving mechanism.
 */
export declare function resolveMoveSnapPreview(preview: TransformPreview, document: {
    shapes: Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
}, options?: MoveSnapOptions): {
    preview: TransformPreview;
    guides: SnapGuide[];
};
export declare function resolveSnapGuideLines(options: {
    guides: SnapGuide[];
    documentWidth: number;
    documentHeight: number;
    matrix: Mat3;
}): SnapGuideLine[];
