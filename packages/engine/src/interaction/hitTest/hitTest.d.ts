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
    /** Stroke width in document units. */
    strokeWidth?: number;
    /** Stroke alignment relative to path geometry. */
    strokeAlign?: 'center' | 'inside' | 'outside';
    /** Dash pattern (not yet used by hit-test geometry). */
    strokeDashArray?: readonly number[];
    /** Line cap style (not yet used by hit-test geometry). */
    strokeCap?: 'butt' | 'round' | 'square';
    /** Line join style (not yet used by hit-test geometry). */
    strokeJoin?: 'miter' | 'round' | 'bevel';
    cornerRadius?: number;
    cornerRadii?: {
        topLeft?: number;
        topRight?: number;
        bottomRight?: number;
        bottomLeft?: number;
    };
    points?: EngineEditorPoint[];
    bezierPoints?: EngineEditorBezierPoint[];
    closed?: boolean;
    ellipseStartAngle?: number;
    ellipseEndAngle?: number;
    ellipseDrawWedgeLine?: boolean;
    text?: string;
    textRuns?: Array<{
        start: number;
        end: number;
        style?: {
            fontSize?: number;
            lineHeight?: number;
            textAlign?: 'left' | 'center' | 'right';
            verticalAlign?: 'top' | 'middle' | 'bottom';
        };
    }>;
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
