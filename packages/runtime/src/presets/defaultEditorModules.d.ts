import type { CanvasRuntimeModule } from '@venus/runtime';
import { type CanvasHistoryConfig } from './history.ts';
import { type CanvasProtocolConfig } from './protocol.ts';
import { type CanvasSelectionConfig } from './selection.ts';
import { type CanvasSnapConfig } from './snapping.ts';
export declare function createDefaultRuntimeModules<TSnapshot>(options?: {
    selection?: Partial<CanvasSelectionConfig>;
    snapping?: Partial<CanvasSnapConfig>;
    snappingPreset?: 'off' | 'bounds' | 'precision';
    history?: Partial<CanvasHistoryConfig>;
    protocol?: Partial<CanvasProtocolConfig>;
    onHistoryCommand?: (command: {
        type: string;
    }) => void;
    onProtocolCommand?: (command: {
        type: string;
    }) => void;
}): CanvasRuntimeModule<TSnapshot>[];
export declare function createDefaultEditorModules<TSnapshot>(options?: {
    selection?: Partial<CanvasSelectionConfig>;
    snapping?: Partial<CanvasSnapConfig>;
    snappingPreset?: 'off' | 'bounds' | 'precision';
    history?: Partial<CanvasHistoryConfig>;
    protocol?: Partial<CanvasProtocolConfig>;
    onHistoryCommand?: (command: {
        type: string;
    }) => void;
    onProtocolCommand?: (command: {
        type: string;
    }) => void;
}): CanvasRuntimeModule<TSnapshot>[];
