export interface BuildEngineReplayTilesOptions {
    width: number;
    height: number;
    tileSize: number;
}
export interface EngineReplayTile {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Builds replay tiles ordered from viewport center to edges so progressive
 * bitmap playback fills the area users look at first.
 */
export declare function buildEngineReplayTiles(options: BuildEngineReplayTilesOptions): EngineReplayTile[];
