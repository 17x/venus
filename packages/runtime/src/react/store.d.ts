export interface CanvasSnapshotStore<TSnapshot, TController> {
    controller: TController;
    getSnapshot: () => TSnapshot;
    subscribe: (listener: () => void) => () => void;
}
export declare function useCanvasStoreSelector<TSnapshot, TController, TSelection>(store: CanvasSnapshotStore<TSnapshot, TController>, selector: (snapshot: TSnapshot) => TSelection, isEqual?: (previous: TSelection, next: TSelection) => boolean): TSelection;
