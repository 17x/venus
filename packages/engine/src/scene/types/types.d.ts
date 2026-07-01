import type { EngineSceneBufferLayout } from '../buffer/buffer.ts';

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

export interface EngineAnchorPoint {
    x: number;
    y: number;
    cp1?: EnginePoint | null;
    cp2?: EnginePoint | null;
}

export interface EngineRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface EngineEllipseGeometry {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
}

export interface EngineTransform2D {
    matrix: readonly [number, number, number, number, number, number];
}

export interface EngineShadow {
    color?: string;
    offsetX?: number;
    offsetY?: number;
    blur?: number;
}

export interface EngineInnerShadow {
    color?: string;
    blur?: number;
}

export interface EngineLayerBlur {
    amount: number;
}

export interface EngineVisualEffects {
    opacity?: number;
    blendMode?: string;
    shadow?: EngineShadow;
    innerShadow?: EngineInnerShadow;
    layerBlur?: EngineLayerBlur;
}

export interface EngineGradientStop {
    offset: number;
    color: string;
    opacity?: number;
}

export interface EngineLinearGradient {
    type: 'linear';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    stops: readonly EngineGradientStop[];
}

export interface EngineRadialGradient {
    type: 'radial';
    centerX: number;
    centerY: number;
    radius: number;
    stops: readonly EngineGradientStop[];
}

export type EngineGradient = EngineLinearGradient | EngineRadialGradient;

export interface EngineSolidPaint {
    type: 'solid';
    color: string;
    opacity?: number;
}

export interface EngineGradientPaint {
    type: 'gradient';
    gradient: EngineGradient;
    opacity?: number;
}

export type EnginePaint = EngineSolidPaint | EngineGradientPaint;

export type EngineStrokeAlign = 'center' | 'inside' | 'outside';

export interface EngineRectangleCornerRadii {
    topLeft?: number;
    topRight?: number;
    bottomRight?: number;
    bottomLeft?: number;
}

export type EngineStrokeArrowhead = 'none' | 'triangle' | 'diamond' | 'circle' | 'bar';

export interface EngineStrokeConfig {
    paints?: readonly EnginePaint[];
    color?: string;
    width?: number;
    align?: EngineStrokeAlign;
    dashArray?: readonly number[];
    cap?: 'butt' | 'round' | 'square';
    join?: 'miter' | 'round' | 'bevel';
    startArrowhead?: EngineStrokeArrowhead;
    endArrowhead?: EngineStrokeArrowhead;
}

export interface EngineFillConfig {
    paints?: readonly EnginePaint[];
    color?: string;
}

export type EngineClipShape =
    | {
        kind: 'rect';
        rect: EngineRect;
        radius?: number;
    }
    | {
        kind: 'path';
        points: readonly EnginePoint[];
        closed?: boolean;
    };

export interface EngineNodeClip {
    clipNodeId?: EngineNodeId;
    clipShape?: EngineClipShape;
    rule?: 'nonzero' | 'evenodd';
}

export interface EngineNodeBase {
    id: EngineNodeId;
    type: string;
    visual?: EngineVisualEffects;
    /** @deprecated Use `visual.opacity` instead. */
    opacity?: number;
    /** @deprecated Use `visual.blendMode` instead. */
    blendMode?: string;
    transform?: EngineTransform2D;
    /** @deprecated Use `visual.shadow` instead. */
    shadow?: EngineShadow;
    /** @deprecated Use `visual.innerShadow` instead. */
    innerShadow?: EngineInnerShadow;
    /** @deprecated Use `visual.layerBlur` instead. */
    layerBlur?: EngineLayerBlur;
    clip?: EngineNodeClip;
}

export interface EngineTextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight?: number | string;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    lineHeight?: number;
    letterSpacing?: number;
    fillConfig?: EngineFillConfig;
    strokeConfig?: EngineStrokeConfig;
    align?: 'start' | 'center' | 'end';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    shadow?: EngineShadow;
    /** @deprecated Use `fillConfig.color` instead. */
    fill?: string;
    /** @deprecated Use `fillConfig.paints` instead. */
    fills?: readonly EnginePaint[];
    /** @deprecated Use `strokeConfig.color` instead. */
    stroke?: string;
    /** @deprecated Use `strokeConfig.width` instead. */
    strokeWidth?: number;
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
    cacheKey?: string;
    lineCount?: number;
    maxLineHeight?: number;
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
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    ellipseGeometry?: EngineEllipseGeometry;
    fillConfig?: EngineFillConfig;
    strokeConfig?: EngineStrokeConfig;
    cornerRadius?: number;
    cornerRadii?: EngineRectangleCornerRadii;
    ellipseStartAngle?: number;
    ellipseEndAngle?: number;
    ellipseDrawWedgeLine?: boolean;
    points?: readonly EnginePoint[];
    bezierPoints?: readonly EngineBezierPoint[];
    pointCount?: number;
    bezierPointCount?: number;
    anchorPoints?: readonly EngineAnchorPoint[];
    closed?: boolean;
    /** @deprecated Use `fillConfig.color` instead. */
    fill?: string;
    /** @deprecated Use `fillConfig.paints` instead. */
    fills?: readonly EnginePaint[];
    /** @deprecated Use `strokeConfig.color` instead. */
    stroke?: string;
    /** @deprecated Use `strokeConfig.paints` instead. */
    strokes?: readonly EnginePaint[];
    /** @deprecated Use `strokeConfig.width` instead. */
    strokeWidth?: number;
    /** @deprecated Use `strokeConfig.align` instead. */
    strokeAlign?: EngineStrokeAlign;
    /** @deprecated Use `strokeConfig.dashArray` instead. */
    strokeDashArray?: readonly number[];
    /** @deprecated Use `strokeConfig.cap` instead. */
    strokeCap?: 'butt' | 'round' | 'square';
    /** @deprecated Use `strokeConfig.join` instead. */
    strokeJoin?: 'miter' | 'round' | 'bevel';
    /** @deprecated Use `strokeConfig.startArrowhead` instead. */
    strokeStartArrowhead?: EngineStrokeArrowhead;
    /** @deprecated Use `strokeConfig.endArrowhead` instead. */
    strokeEndArrowhead?: EngineStrokeArrowhead;
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
