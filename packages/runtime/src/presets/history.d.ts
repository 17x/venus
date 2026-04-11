import type { CanvasRuntimeModule } from '@venus/runtime';
export interface CanvasHistoryConfig {
    enabled: boolean;
}
export interface CanvasHistoryModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
    kind: 'history';
    config: CanvasHistoryConfig;
}
export declare const DEFAULT_HISTORY_CONFIG: CanvasHistoryConfig;
export declare function isHistoryCommand(command: {
    type: string;
}): boolean;
export declare function createHistoryModule<TSnapshot>(options?: {
    id?: string;
    config?: Partial<CanvasHistoryConfig>;
    onHistoryCommand?: (command: {
        type: string;
    }) => void;
}): CanvasHistoryModule<TSnapshot>;
