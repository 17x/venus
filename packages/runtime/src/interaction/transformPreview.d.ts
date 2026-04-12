import type { DocumentNode, EditorDocument } from '@venus/document-core';
export interface TransformPreviewGeometry {
    shapeId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface TransformPreviewRuntimeShape {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface TransformPreviewRuntimeSnapshot {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface BuildTransformPreviewMapOptions {
    includeClipBoundImagePreview?: boolean;
    runtimeShapes?: TransformPreviewRuntimeShape[];
}
/**
 * Build a preview map that expands moved group previews to descendants so
 * render-time preview geometry remains consistent with group transforms.
 *
 * Optional clip-bound image preview propagation keeps clipped image previews
 * moving with their clip source during drag/resize before commit.
 */
export declare function buildGroupAwareTransformPreviewMap(document: EditorDocument, previewShapes: TransformPreviewGeometry[], options?: BuildTransformPreviewMapOptions): Map<string, TransformPreviewGeometry>;
/**
 * Apply preview geometry to a document node, remapping authored point/bezier
 * geometry into the new preview bounds when needed.
 */
export declare function applyTransformPreviewGeometryToShape(shape: DocumentNode, preview: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}): {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number | undefined;
    flipX: boolean | undefined;
    flipY: boolean | undefined;
    points: import("@venus/document-core").Point[] | undefined;
    bezierPoints: import("@venus/document-core").BezierPoint[] | undefined;
    id: string;
    type: import("@venus/document-core").ShapeType;
    name: string;
    parentId?: string | null;
    childIds?: string[];
    text?: string;
    textRuns?: import("@venus/document-core").TextRun[];
    assetId?: string;
    assetUrl?: string;
    clipPathId?: string;
    clipRule?: "nonzero" | "evenodd";
    strokeStartArrowhead?: import("@venus/document-core").StrokeArrowhead;
    strokeEndArrowhead?: import("@venus/document-core").StrokeArrowhead;
    fill?: import("@venus/document-core").ShapeFillStyle;
    stroke?: import("@venus/document-core").ShapeStrokeStyle;
    shadow?: import("@venus/document-core").ShapeShadowStyle;
    cornerRadius?: number;
    cornerRadii?: import("@venus/document-core").RectangleCornerRadii;
    ellipseStartAngle?: number;
    ellipseEndAngle?: number;
    schema?: import("@venus/document-core").DocumentSchemaMeta;
};
/**
 * Resolve preview map + preview-adjusted document/runtime snapshot state from
 * one shared transform-preview computation.
 */
export declare function resolveTransformPreviewRuntimeState<TRuntimeShape extends TransformPreviewRuntimeSnapshot>(document: EditorDocument, runtimeShapes: TRuntimeShape[], previewShapes: TransformPreviewGeometry[] | null | undefined, options?: {
    includeClipBoundImagePreview?: boolean;
}): {
    previewById: null;
    previewDocument: EditorDocument;
    previewShapes: TRuntimeShape[];
} | {
    previewById: Map<string, TransformPreviewGeometry>;
    previewDocument: {
        shapes: DocumentNode[];
        id: string;
        name: string;
        width: number;
        height: number;
    };
    previewShapes: TRuntimeShape[];
};
