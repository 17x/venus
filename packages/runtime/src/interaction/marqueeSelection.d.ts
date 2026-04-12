import { type EngineMarqueeApplyMode, type EngineMarqueeBounds, type EngineMarqueePoint, type EngineMarqueeSelectableShape, type EngineMarqueeSelectionMatchMode, type EngineMarqueeSelectionMode, type EngineMarqueeState } from '@venus/engine';
export type MarqueePoint = EngineMarqueePoint;
export type MarqueeBounds = EngineMarqueeBounds;
export type MarqueeSelectionMode = EngineMarqueeSelectionMode;
export type MarqueeSelectionMatchMode = EngineMarqueeSelectionMatchMode;
export type MarqueeApplyMode = EngineMarqueeApplyMode;
export type MarqueeState = EngineMarqueeState;
export type MarqueeSelectableShape = EngineMarqueeSelectableShape & {
    type?: string;
};
export declare function createMarqueeState(start: MarqueePoint, mode: MarqueeSelectionMode, options?: {
    applyMode?: MarqueeApplyMode;
}): MarqueeState;
export declare function updateMarqueeState(state: MarqueeState, current: MarqueePoint): MarqueeState;
export declare function resolveMarqueeBounds(state: MarqueeState): MarqueeBounds;
export declare function resolveMarqueeSelection(shapes: MarqueeSelectableShape[], bounds: MarqueeBounds, options?: {
    matchMode?: MarqueeSelectionMatchMode;
    excludeShape?: (shape: MarqueeSelectableShape) => boolean;
}): string[];
export declare function getNormalizedBounds(x: number, y: number, width: number, height: number): MarqueeBounds;
export declare function intersectsBounds(left: MarqueeBounds, right: MarqueeBounds): boolean;
export declare function containsBounds(container: MarqueeBounds, target: MarqueeBounds): boolean;
