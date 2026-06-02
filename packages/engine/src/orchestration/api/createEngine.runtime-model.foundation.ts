import type {
  EngineRuntimeModelAssetDescriptor,
  EngineRuntimeModelDiagnosticsOutput,
  EngineRuntimeModelInstanceDescriptor,
  EngineRuntimeModelInstanceSnapshot,
} from "./public-types";

type RuntimeModelAssetRecord = {
  id: string;
  resourceId?: string;
  scene: EngineRuntimeModelAssetDescriptor["scene"];
  lodDistances: readonly number[];
};

type RuntimeModelInstanceRecord = {
  id: string;
  modelId: string;
  translation: readonly [number, number, number];
  rotation: readonly [number, number, number];
  scale: readonly [number, number, number];
  color?: string;
  lodLevelOverride?: number;
};

type RuntimeModelDependencies = {
  runtimeModelAssets: Map<string, RuntimeModelAssetRecord>;
  runtimeModelInstances: Map<string, RuntimeModelInstanceRecord>;
  emitEvent: (type: string, payload: unknown) => void;
};

const DEFAULT_VEC3: readonly [number, number, number] = [0, 0, 0];
const DEFAULT_SCALE: readonly [number, number, number] = [1, 1, 1];

function normalizeVec3(
  value: readonly [number, number, number] | undefined,
  fallback: readonly [number, number, number],
): readonly [number, number, number] {
  if (!value) {
    return fallback;
  }
  return [
    Number.isFinite(value[0]) ? value[0] : fallback[0],
    Number.isFinite(value[1]) ? value[1] : fallback[1],
    Number.isFinite(value[2]) ? value[2] : fallback[2],
  ];
}

function normalizeLodDistances(distances: readonly number[] | undefined): readonly number[] {
  return [...(distances ?? [])]
    .filter((distance) => Number.isFinite(distance) && distance >= 0)
    .map((distance) => Math.max(0, distance))
    .sort((left, right) => left - right);
}

function countMeshNodes(asset: RuntimeModelAssetRecord): number {
  return asset.scene.nodes.filter((node) => Boolean(node.mesh)).length;
}

function resolveLodLevel(distance: number, lodDistances: readonly number[]): number {
  for (let index = 0; index < lodDistances.length; index += 1) {
    if (distance <= (lodDistances[index] ?? Number.POSITIVE_INFINITY)) {
      return index;
    }
  }
  return lodDistances.length;
}

export function createRuntimeModelFoundation(deps: RuntimeModelDependencies): {
  registerRuntimeModelAsset: (descriptor: EngineRuntimeModelAssetDescriptor) => EngineRuntimeModelDiagnosticsOutput;
  unregisterRuntimeModelAsset: (modelId: string) => { unregistered: boolean; removedInstanceCount: number };
  setRuntimeModelInstances: (instances: readonly EngineRuntimeModelInstanceDescriptor[]) => EngineRuntimeModelDiagnosticsOutput;
  getRuntimeModelInstances: (options?: { cameraPosition?: readonly [number, number, number] }) => readonly EngineRuntimeModelInstanceSnapshot[];
  resolveRuntimeModelDiagnostics: () => EngineRuntimeModelDiagnosticsOutput;
} {
  function resolveRuntimeModelDiagnostics(): EngineRuntimeModelDiagnosticsOutput {
    const instancedModelIds = new Set<string>();
    let missingModelInstanceCount = 0;
    let lodResolvedInstanceCount = 0;
    for (const instance of deps.runtimeModelInstances.values()) {
      const asset = deps.runtimeModelAssets.get(instance.modelId);
      if (!asset) {
        missingModelInstanceCount += 1;
        continue;
      }
      instancedModelIds.add(instance.modelId);
      if (instance.lodLevelOverride !== undefined || asset.lodDistances.length > 0) {
        lodResolvedInstanceCount += 1;
      }
    }
    let meshNodeCount = 0;
    for (const asset of deps.runtimeModelAssets.values()) {
      meshNodeCount += countMeshNodes(asset);
    }
    return {
      registeredModelCount: deps.runtimeModelAssets.size,
      instanceCount: deps.runtimeModelInstances.size,
      instancedModelCount: instancedModelIds.size,
      missingModelInstanceCount,
      lodResolvedInstanceCount,
      meshNodeCount,
    };
  }

  function registerRuntimeModelAsset(
    descriptor: EngineRuntimeModelAssetDescriptor,
  ): EngineRuntimeModelDiagnosticsOutput {
    if (!descriptor || typeof descriptor.id !== "string" || descriptor.id.length === 0) {
      throw new Error("ENGINE_MODEL_INVALID_DESCRIPTOR");
    }
    deps.runtimeModelAssets.set(descriptor.id, {
      id: descriptor.id,
      ...(descriptor.resourceId ? { resourceId: descriptor.resourceId } : {}),
      scene: descriptor.scene,
      lodDistances: normalizeLodDistances(descriptor.lodDistances),
    });
    const diagnostics = resolveRuntimeModelDiagnostics();
    deps.emitEvent("engine.runtime.model.assetRegistered", {
      modelId: descriptor.id,
      meshNodeCount: countMeshNodes(deps.runtimeModelAssets.get(descriptor.id)!),
    });
    return diagnostics;
  }

  function unregisterRuntimeModelAsset(modelId: string): { unregistered: boolean; removedInstanceCount: number } {
    if (!deps.runtimeModelAssets.has(modelId)) {
      return { unregistered: false, removedInstanceCount: 0 };
    }
    deps.runtimeModelAssets.delete(modelId);
    let removedInstanceCount = 0;
    for (const [instanceId, instance] of deps.runtimeModelInstances.entries()) {
      if (instance.modelId === modelId) {
        deps.runtimeModelInstances.delete(instanceId);
        removedInstanceCount += 1;
      }
    }
    deps.emitEvent("engine.runtime.model.assetUnregistered", { modelId, removedInstanceCount });
    return { unregistered: true, removedInstanceCount };
  }

  function setRuntimeModelInstances(
    instances: readonly EngineRuntimeModelInstanceDescriptor[],
  ): EngineRuntimeModelDiagnosticsOutput {
    deps.runtimeModelInstances.clear();
    for (const instance of instances) {
      if (!instance || typeof instance.id !== "string" || instance.id.length === 0 || typeof instance.modelId !== "string" || instance.modelId.length === 0) {
        throw new Error("ENGINE_MODEL_INVALID_INSTANCE");
      }
      deps.runtimeModelInstances.set(instance.id, {
        id: instance.id,
        modelId: instance.modelId,
        translation: normalizeVec3(instance.translation, DEFAULT_VEC3),
        rotation: normalizeVec3(instance.rotation, DEFAULT_VEC3),
        scale: normalizeVec3(instance.scale, DEFAULT_SCALE),
        ...(instance.color ? { color: instance.color } : {}),
        ...(typeof instance.lodLevelOverride === "number" && Number.isFinite(instance.lodLevelOverride)
          ? { lodLevelOverride: Math.max(0, Math.floor(instance.lodLevelOverride)) }
          : {}),
      });
    }
    const diagnostics = resolveRuntimeModelDiagnostics();
    deps.emitEvent("engine.runtime.model.instancesUpdated", diagnostics);
    return diagnostics;
  }

  function getRuntimeModelInstances(
    options?: { cameraPosition?: readonly [number, number, number] },
  ): readonly EngineRuntimeModelInstanceSnapshot[] {
    const cameraPosition = normalizeVec3(options?.cameraPosition as readonly [number, number, number] | undefined, DEFAULT_VEC3);
    return [...deps.runtimeModelInstances.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((instance) => {
        const asset = deps.runtimeModelAssets.get(instance.modelId);
        const distance = Math.hypot(
          instance.translation[0] - cameraPosition[0],
          instance.translation[1] - cameraPosition[1],
          instance.translation[2] - cameraPosition[2],
        );
        const lodLevel = instance.lodLevelOverride ?? resolveLodLevel(distance, asset?.lodDistances ?? []);
        return {
          id: instance.id,
          modelId: instance.modelId,
          translation: instance.translation,
          rotation: instance.rotation,
          scale: instance.scale,
          ...(instance.color ? { color: instance.color } : {}),
          lodLevel,
        };
      });
  }

  return {
    registerRuntimeModelAsset,
    unregisterRuntimeModelAsset,
    setRuntimeModelInstances,
    getRuntimeModelInstances,
    resolveRuntimeModelDiagnostics,
  };
}
