import type { EngineClipShape, EnginePoint, EngineRect, EngineShapeKind, EngineShapeNode, EngineStrokeAlign } from '../types/types.ts';

export type EngineCanonicalGeometrySource = 'shape' | 'clip';
export type EngineCanonicalGeometryOutlineKind = 'rect' | 'ellipse' | 'line' | 'polygon' | 'path';
export type EngineCanonicalHitTestKind = 'rectangle' | 'ellipse' | 'lineSegment' | 'polygon' | 'star' | 'path';
export type EngineCanonicalRenderKind = EngineShapeKind | 'clip';

export interface EngineCanonicalGeometryOutline {
    kind: EngineCanonicalGeometryOutlineKind;
    bounds: EngineRect;
    points?: readonly EnginePoint[];
    bezierPoints?: EngineShapeNode['bezierPoints'];
    closed: boolean;
    arc?: {
        startAngle: number;
        endAngle: number;
        drawWedgeLine: boolean;
    };
}

export interface EngineCanonicalGeometryPayload {
    source: EngineCanonicalGeometrySource;
    nodeId: string;
    authoredKind: string;
    renderKind: EngineCanonicalRenderKind;
    hitTestKind: EngineCanonicalHitTestKind;
    geometryBounds: EngineRect;
    strokeBounds: EngineRect;
    handleBounds: EngineRect;
    visualBounds: EngineRect;
    outline: EngineCanonicalGeometryOutline;
    strokeWidth: number;
    strokeAlign: EngineStrokeAlign;
    pointCount: number;
    bezierPointCount: number;
    closed: boolean;
    cacheKey: string;
}

export declare function resolveEngineShapeGeometry(node: EngineShapeNode): EngineCanonicalGeometryPayload;
export declare function resolveEngineClipGeometry(ownerId: string, clipShape: EngineClipShape): EngineCanonicalGeometryPayload;
export declare function resolveEngineShapeGeometryBounds(node: EngineShapeNode): EngineRect;
export declare function resolveEngineShapeStrokeBounds(node: EngineShapeNode): EngineRect;
export declare function resolveEngineShapeStrokeWidth(node: EngineShapeNode): number;
