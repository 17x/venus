import type { EngineSceneBufferLayout } from './buffer.ts';
export type EngineNodeId = string;
export interface EnginePoint {
    x: number;
    y: number;
}
export interface EngineBezierPoint {
    anchor: EnginePoint;
    cp1?: EnginePoint | null;
    cp2?: EnginePoint | null;
}
export interface EngineRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface EngineTransform2D {
    matrix: readonly [number, number, number, number, number, number];
}
export type EngineClipShape = {
    kind: 'rect';
    rect: EngineRect;
    radius?: number;
} | {
    kind: 'path';
    points: readonly EnginePoint[];
    closed?: boolean;
};
export interface EngineNodeBase {
    id: EngineNodeId;
    type: string;
    opacity?: number;
    blendMode?: string;
    transform?: EngineTransform2D;
    shadow?: {
        color?: string;
        offsetX?: number;
        offsetY?: number;
        blur?: number;
    };
    clip?: {
        clipNodeId?: EngineNodeId;
        clipShape?: EngineClipShape;
        rule?: 'nonzero' | 'evenodd';
    };
}
export interface EngineTextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    lineHeight?: number;
    letterSpacing?: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    align?: 'start' | 'center' | 'end';
    verticalAlign?: 'top' | 'middle' | 'bottom';
}
export interface EngineTextRun {
    text: string;
    style?: Partial<EngineTextStyle>;
}
export interface EngineTextNode extends EngineNodeBase {
    type: 'text';
    x: number;
    y: number;
    width?: number;
    height?: number;
    style: EngineTextStyle;
    text?: string;
    runs?: readonly EngineTextRun[];
    wrap?: 'none' | 'word' | 'char';
}
export interface EngineImageNode extends EngineNodeBase {
    type: 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    assetId: string;
    sourceRect?: EngineRect;
    naturalSize?: {
        width: number;
        height: number;
    };
    imageSmoothing?: boolean;
}
export interface EngineGroupNode extends EngineNodeBase {
    type: 'group';
    children: readonly EngineRenderableNode[];
}
export interface EngineShapeNode extends EngineNodeBase {
    type: 'shape';
    shape: 'rect' | 'ellipse' | 'line' | 'polygon' | 'path';
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius?: number;
    cornerRadii?: {
        topLeft?: number;
        topRight?: number;
        bottomRight?: number;
        bottomLeft?: number;
    };
    ellipseStartAngle?: number;
    ellipseEndAngle?: number;
    strokeStartArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar';
    strokeEndArrowhead?: 'none' | 'triangle' | 'diamond' | 'circle' | 'bar';
    points?: readonly EnginePoint[];
    bezierPoints?: readonly EngineBezierPoint[];
    closed?: boolean;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}
export type EngineRenderableNode = EngineTextNode | EngineImageNode | EngineShapeNode | EngineGroupNode;
export interface EngineSceneSnapshot {
    revision: string | number;
    width: number;
    height: number;
    nodes: readonly EngineRenderableNode[];
    metadata?: {
        planVersion?: number;
        bufferVersion?: number;
        dirtyNodeIds?: readonly EngineNodeId[];
        removedNodeIds?: readonly EngineNodeId[];
        bufferLayout?: EngineSceneBufferLayout;
    };
}
