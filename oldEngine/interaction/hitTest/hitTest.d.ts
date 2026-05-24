export type EngineEditorNodeType = 'frame' | 'group' | 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'lineSegment' | 'path' | 'text' | 'image';
export interface EngineEditorPoint {
    x: number;
    y: number;
}
export interface EngineEditorBezierPoint {
    anchor: EngineEditorPoint;
    cp1?: EngineEditorPoint | null;
    cp2?: EngineEditorPoint | null;
}
export interface EngineEditorHitTestNode {
    id: string;
    type: EngineEditorNodeType;
    parentId?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
    clipPathId?: string;
    fill?: {
        enabled?: boolean;
    };
    stroke?: {
        enabled?: boolean;
    };
    points?: EngineEditorPoint[];
    bezierPoints?: EngineEditorBezierPoint[];
    schema?: {
        sourceFeatureKinds?: string[];
    };
}
export interface EngineShapeHitTestOptions {
    allowFrameSelection?: boolean;
    tolerance?: number;
    strictStrokeHitTest?: boolean;
    shapeById?: Map<string, EngineEditorHitTestNode>;
}
export interface EngineClipHitTestOptions {
    tolerance?: number;
    shapeById?: Map<string, EngineEditorHitTestNode>;
}
export declare function isPointInsideEngineClipShape(pointer: EngineEditorPoint, clipSource: EngineEditorHitTestNode, options?: EngineClipHitTestOptions): boolean;
export declare function isPointInsideEngineShapeHitArea(pointer: EngineEditorPoint, shape: EngineEditorHitTestNode, options?: EngineShapeHitTestOptions): boolean;
