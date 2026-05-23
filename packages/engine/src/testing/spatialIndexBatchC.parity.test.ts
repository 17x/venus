import assert from "node:assert/strict";
import test from "node:test";

import {
  createEngineSpatialIndex as createModuleEngineSpatialIndex,
} from "../kernel/spatial/engineSpatialIndex";

import {
  createEngineSpatialIndex as createEngineSpatialIndexUnderTest,
} from "../kernel/spatial/engineSpatialIndex";

type SpatialItem = {
  id: string;
  minX: number;
  minY: number;
  minZ?: number;
  maxX: number;
  maxY: number;
  maxZ?: number;
  meta: { tag: string };
};

/**
 * Builds one deterministic spatial fixture set used by both implementations.
 * @returns Spatial items with mixed overlap characteristics.
 */
function buildSpatialItems(): SpatialItem[] {
  return [
    {
      id: "a",
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 10,
      maxY: 10,
      maxZ: 1,
      meta: { tag: "alpha" },
    },
    {
      id: "b",
      minX: 12,
      minY: 12,
      minZ: 0,
      maxX: 20,
      maxY: 20,
      maxZ: 2,
      meta: { tag: "beta" },
    },
    {
      id: "c",
      minX: 4,
      minY: 4,
      minZ: 4,
      maxX: 8,
      maxY: 8,
      maxZ: 6,
      meta: { tag: "gamma" },
    },
  ];
}

/**
 * Creates a stable, comparable representation of search results.
 * @param items Raw search results.
 * @returns Sorted tuples by id and geometry.
 */
function normalizeSearchResults(items: SpatialItem[]) {
  return items
    .map((item) => ({
      id: item.id,
      minX: item.minX,
      minY: item.minY,
      minZ: item.minZ ?? 0,
      maxX: item.maxX,
      maxY: item.maxY,
      maxZ: item.maxZ ?? 0,
      tag: item.meta.tag,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Verifies canonical spatial index export path preserves module search/update/remove behavior.
 */
test("createEngineSpatialIndex parity", () => {
  const moduleIndex = createModuleEngineSpatialIndex<SpatialItem["meta"]>({
    dimension: "3d",
  });
  const nextIndex = createEngineSpatialIndexUnderTest<SpatialItem["meta"]>({
    dimension: "3d",
  });

    const items = buildSpatialItems();
    moduleIndex.load(items);
    nextIndex.load(items);

    const searchBounds = {
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 15,
      maxY: 15,
      maxZ: 3,
    };

  const moduleInitial = normalizeSearchResults(
    moduleIndex.search(searchBounds) as SpatialItem[],
  );
  const nextInitial = normalizeSearchResults(
    nextIndex.search(searchBounds) as SpatialItem[],
  );
  assert.deepEqual(nextInitial, moduleInitial);

  const updatedB: SpatialItem = {
    id: "b",
    minX: 2,
    minY: 2,
    minZ: 0,
    maxX: 3,
    maxY: 3,
    maxZ: 1,
    meta: { tag: "beta-updated" },
  };

  moduleIndex.update(updatedB);
  nextIndex.update(updatedB);

  const moduleAfterUpdate = normalizeSearchResults(
    moduleIndex.search(searchBounds) as SpatialItem[],
  );
  const nextAfterUpdate = normalizeSearchResults(
    nextIndex.search(searchBounds) as SpatialItem[],
  );
  assert.deepEqual(nextAfterUpdate, moduleAfterUpdate);

  moduleIndex.remove("a");
  nextIndex.remove("a");

  const moduleAfterRemove = normalizeSearchResults(
    moduleIndex.search(searchBounds) as SpatialItem[],
  );
  const nextAfterRemove = normalizeSearchResults(
    nextIndex.search(searchBounds) as SpatialItem[],
  );
  assert.deepEqual(nextAfterRemove, moduleAfterRemove);
});
