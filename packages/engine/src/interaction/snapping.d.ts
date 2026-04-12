export type EngineSnapAxis = 'x' | 'y';
export interface EngineSnapGuide {
    axis: EngineSnapAxis;
    value: number;
    kind: 'edge-min' | 'edge-max' | 'center';
}
export interface EngineMoveSnapOptions {
    tolerance?: number;
}
export interface EngineSnapGuideLine {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
export interface EngineMoveSnapShape {
    shapeId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface EngineMoveSnapPreview {
    shapes: EngineMoveSnapShape[];
}
export interface EngineSnapSceneShape {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface EngineSnapScene {
    shapes: EngineSnapSceneShape[];
}
export declare function resolveEngineMoveSnapPreview<TShape extends EngineMoveSnapShape>(preview: {
    shapes: TShape[];
}, scene: EngineSnapScene, options?: EngineMoveSnapOptions): {
    preview: {
        shapes: TShape[];
    };
    guides: EngineSnapGuide[];
};
export declare function resolveEngineSnapGuideLines(options: {
    guides: EngineSnapGuide[];
    documentWidth: number;
    documentHeight: number;
    projectPoint: (point: {
        x: number;
        y: number;
    }) => {
        x: number;
        y: number;
    };
}): EngineSnapGuideLine[];
