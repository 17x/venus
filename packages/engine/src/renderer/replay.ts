export interface BuildEngineReplayTilesOptions {
  width: number
  height: number
  tileSize: number
}

export interface EngineReplayTile {
  x: number
  y: number
  width: number
  height: number
}

interface RankedTile extends EngineReplayTile {
  distance: number
}

/**
 * Builds replay tiles ordered from viewport center to edges so progressive
 * bitmap playback fills the area users look at first.
 */
export function buildEngineReplayTiles(
  options: BuildEngineReplayTilesOptions,
): EngineReplayTile[] {
  const width = Math.max(1, Math.floor(options.width))
  const height = Math.max(1, Math.floor(options.height))
  const safeTile = Math.max(64, Math.floor(options.tileSize))
  const columns = Math.ceil(width / safeTile)
  const rows = Math.ceil(height / safeTile)
  const centerX = width / 2
  const centerY = height / 2
  const tiles: RankedTile[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = col * safeTile
      const y = row * safeTile
      const tileWidth = Math.min(safeTile, width - x)
      const tileHeight = Math.min(safeTile, height - y)
      const tileCenterX = x + tileWidth / 2
      const tileCenterY = y + tileHeight / 2

      tiles.push({
        x,
        y,
        width: tileWidth,
        height: tileHeight,
        distance: Math.hypot(tileCenterX - centerX, tileCenterY - centerY),
      })
    }
  }

  tiles.sort((left, right) => left.distance - right.distance)
  return tiles.map(({distance: _distance, ...tile}) => tile)
}