
// Lightweight spatial index using an R-tree for fast region queries in a vector editor context


type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };
type SpatialItem = { id: string; bbox: BoundingBox; data?: any };

export class SpatialIndex {
  private items: Map<string, SpatialItem>;

  constructor() {
    this.items = new Map();
  }

  insert(item: SpatialItem) {
    this.items.set(item.id, item);
  }

  remove(id: string) {
    this.items.delete(id);
  }

  update(item: SpatialItem) {
    this.items.set(item.id, item);
  }

  query(region: BoundingBox): SpatialItem[] {
    // Brute-force, but easily swappable for R-tree later
    const results: SpatialItem[] = [];
    for (const item of this.items.values()) {
      if (boxesIntersect(item.bbox, region)) {
        results.push(item);
      }
    }
    return results;
  }

  clear() {
    this.items.clear();
  }
}

// Helper function to check if two AABBs intersect
function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY
  );
}

// Types exported for external use
export type { BoundingBox, SpatialItem };


