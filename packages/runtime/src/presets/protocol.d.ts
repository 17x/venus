import type { CanvasRuntimeModule } from '@venus/runtime';
export interface CanvasProtocolConfig {
    enabled: boolean;
    blocklist: string[];
}
export interface CanvasProtocolModule<TSnapshot> extends CanvasRuntimeModule<TSnapshot> {
    kind: 'protocol';
    config: CanvasProtocolConfig;
}
export declare const DEFAULT_PROTOCOL_CONFIG: CanvasProtocolConfig;
export declare function createProtocolModule<TSnapshot>(options?: {
    id?: string;
    config?: Partial<CanvasProtocolConfig>;
    onCommand?: (command: {
        type: string;
    }) => void;
}): CanvasProtocolModule<TSnapshot>;
