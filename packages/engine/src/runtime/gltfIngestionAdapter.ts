import type { EngineSceneAsset, EngineSceneAssetNode, EngineSceneAssetMesh } from "../orchestration/api/public-types/scene-asset.types";
import type { EngineMaterialEntity } from "../orchestration/api/public-types/material.types";
import type { EngineAnimationClip } from "../orchestration/api/public-types/animation.types";

/**
 * Declares the glTF runtime ingestion contract for converting loaded glTF data
 * into the engine's canonical scene asset format.
 */
export interface EngineGltfIngestionContract {
  /** Ingests parsed glTF JSON into a canonical scene asset. */
  ingest(gltfRoot: Record<string, unknown>, sourceUri: string): EngineSceneAsset;
}

/**
 * Creates a glTF ingestion adapter that maps glTF 2.0 structure to engine contracts.
 */
export function createEngineGltfIngestionAdapter(): EngineGltfIngestionContract {
  return {
    ingest: (gltfRoot, sourceUri) => {
      const nodes: EngineSceneAssetNode[] = [];
      const materials: EngineMaterialEntity[] = [];
      const animations: EngineAnimationClip[] = [];

      // Map glTF scenes → engine nodes.
      const gltfNodes = (gltfRoot["nodes"] as Array<Record<string, unknown>>) ?? [];
      for (let i = 0; i < gltfNodes.length; i += 1) {
        const gn = gltfNodes[i] ?? {};
        const translation = (gn["translation"] as number[]) ?? [0, 0, 0];
        const rotation = (gn["rotation"] as number[]) ?? [0, 0, 0, 1];
        const scale = (gn["scale"] as number[]) ?? [1, 1, 1];
        const children = (gn["children"] as number[]) ?? [];
        const meshIndex = gn["mesh"] as number | undefined;

        let mesh: EngineSceneAssetMesh | undefined;
        if (typeof meshIndex === "number") {
          const gltfMeshes = (gltfRoot["meshes"] as Array<Record<string, unknown>>) ?? [];
          const gm = gltfMeshes[meshIndex];
          if (gm) {
            const primitives = (gm["primitives"] as Array<Record<string, unknown>>) ?? [];
            const prim = primitives[0];
            if (prim) {
              // Resolve positions from accessor index.
              const accessors = (gltfRoot["accessors"] as Array<Record<string, unknown>>) ?? [];
              const posAccessorIdx = prim["POSITION"] as number | undefined;
              let positions: readonly number[] = [];
              if (typeof posAccessorIdx === "number") {
                const acc = accessors[posAccessorIdx];
                positions = (acc?.["min"] as number[]) ?? [];
              }
              const indicesAccessorIdx = prim["indices"] as number | undefined;
              let indices: readonly number[] | undefined;
              if (typeof indicesAccessorIdx === "number") {
                indices = (accessors[indicesAccessorIdx]?.["min"] as number[]) ?? [];
              }

              mesh = {
                positions,
                indices: indices && indices.length > 0 ? indices : undefined,
                materialId: typeof prim["material"] === "number" ? `mat-${prim["material"]}` : undefined,
              };
            }
          }
        }

        nodes.push({
          id: `node-${i}`,
          name: (gn["name"] as string) ?? `Node_${i}`,
          children: children.map((c) => `node-${c}`),
          translation: translation.slice(0, 3) as [number, number, number],
          rotation: quatToEuler(rotation.slice(0, 4) as [number, number, number, number]),
          scale: scale.slice(0, 3) as [number, number, number],
          mesh,
          materialId: mesh?.materialId,
        });
      }

      // Map glTF materials → engine PBR materials.
      const gltfMaterials = (gltfRoot["materials"] as Array<Record<string, unknown>>) ?? [];
      for (let i = 0; i < gltfMaterials.length; i += 1) {
        const gm = gltfMaterials[i] ?? {};
        const pbr = (gm["pbrMetallicRoughness"] as Record<string, unknown>) ?? {};
        const baseColor = (pbr["baseColorFactor"] as number[]) ?? [1, 1, 1, 1];
        materials.push({
          id: `mat-${i}`,
          type: "pbr",
          name: (gm["name"] as string) ?? `Material_${i}`,
          baseColor: baseColor.slice(0, 4) as [number, number, number, number],
          metallic: (pbr["metallicFactor"] as number) ?? 1,
          roughness: (pbr["roughnessFactor"] as number) ?? 1,
          emissive: ((gm["emissiveFactor"] as number[]) ?? [0, 0, 0]).slice(0, 3) as [number, number, number],
          emissiveIntensity: 1,
          normalScale: 1,
          aoStrength: 1,
          opacity: 1,
          transparent: (gm["alphaMode"] as string) === "BLEND",
          alphaTest: (gm["alphaCutoff"] as number) ?? 0.5,
          doubleSided: (gm["doubleSided"] as boolean) ?? false,
        });
      }

      return {
        metadata: {
          sourceFormat: "gltf",
          sourceUri,
          version: (gltfRoot["asset"] as Record<string, unknown>)?.["version"] as string ?? "2.0",
          generator: (gltfRoot["asset"] as Record<string, unknown>)?.["generator"] as string,
        },
        nodes,
        materials,
        lights: [],
        animations,
      };
    },
  };
}

/**
 * Converts a glTF quaternion [x,y,z,w] to Euler angles [rx,ry,rz] in radians.
 */
function quatToEuler(q: readonly number[]): [number, number, number] {
  const [x, y, z, w] = [q[0] ?? 0, q[1] ?? 0, q[2] ?? 0, q[3] ?? 1];
  // Roll (x-axis rotation).
  const sinrCosp = 2 * (w * x + y * z);
  const cosrCosp = 1 - 2 * (x * x + y * y);
  const rx = Math.atan2(sinrCosp, cosrCosp);
  // Pitch (y-axis rotation).
  const sinp = 2 * (w * y - z * x);
  const ry = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);
  // Yaw (z-axis rotation).
  const sinyCosp = 2 * (w * z + x * y);
  const cosyCosp = 1 - 2 * (y * y + z * z);
  const rz = Math.atan2(sinyCosp, cosyCosp);
  return [rx, ry, rz];
}
