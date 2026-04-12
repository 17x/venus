export interface EngineMarqueePoint {
    x: number;
    y: number;
}
export interface EngineMarqueeBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export type EngineMarqueeSelectionMode = 'replace' | 'add' | 'remove' | 'toggle';
export type EngineMarqueeSelectionMatchMode = 'intersect' | 'contain';
export type EngineMarqueeApplyMode = 'on-pointer-up' | 'while-pointer-move';
export interface EngineMarqueeState {
    start: EngineMarqueePoint;
    current: EngineMarqueePoint;
    mode: EngineMarqueeSelectionMode;
    applyMode: EngineMarqueeApplyMode;
}
export interface EngineMarqueeSelectableShape {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type?: string;
}
export declare function createEngineMarqueeState(start: EngineMarqueePoint, mode: EngineMarqueeSelectionMode, options?: {
    applyMode?: EngineMarqueeApplyMode;
}): EngineMarqueeState;
export declare function updateEngineMarqueeState(state: EngineMarqueeState, current: EngineMarqueePoint): EngineMarqueeState;
export declare function resolveEngineMarqueeBounds(state: EngineMarqueeState): EngineMarqueeBounds;
export declare function resolveEngineMarqueeSelection(shapes: EngineMarqueeSelectableShape[], bounds: EngineMarqueeBounds, options?: {
    matchMode?: EngineMarqueeSelectionMatchMode;
    excludeShape?: (shape: EngineMarqueeSelectableShape) => boolean;
}): string[];
export declare function getEngineNormalizedBounds(x: number, y: number, width: number, height: number): EngineMarqueeBounds;
export declare function intersectsEngineBounds(left: EngineMarqueeBounds, right: EngineMarqueeBounds): boolean;
export declare function containsEngineBounds(container: EngineMarqueeBounds, target: EngineMarqueeBounds): boolean;
