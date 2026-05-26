import type { EngineLightEntity } from "./lighting.types";
import type { EngineMaterialEntity } from "./material.types";
import type { EngineAnimationClip } from "./animation.types";

/**
 * Declares the canonical scene asset format for external loader integration.
 * Provides a structured container for geometry, materials, lights, animations,
 * and scene hierarchy loaded from formats such as glTF, FBX, or OBJ.
 */
export interface EngineSceneAsset {
  /** Asset metadata for source tracking and versioning. */
  metadata: EngineSceneAssetMetadata;
  /** Root scene nodes forming the asset hierarchy. */
  nodes: readonly EngineSceneAssetNode[];
  /** Material entities referenced by mesh nodes. */
  materials: readonly EngineMaterialEntity[];
  /** Light entities placed in the asset scene. */
  lights: readonly EngineLightEntity[];
  /** Animation clips defined in the asset. */
  animations: readonly EngineAnimationClip[];
}

/**
 * Scene asset metadata for source tracking and debugging.
 */
export interface EngineSceneAssetMetadata {
  /** Source format identifier (e.g. "gltf", "fbx", "obj"). */
  sourceFormat: string;
  /** Source URI or file path used to load the asset. */
  sourceUri: string;
  /** Asset version string from the source file. */
  version: string;
  /** Generator tool that produced the source file. */
  generator?: string;
}

/**
 * Declares one node in the canonical scene asset hierarchy.
 */
export interface EngineSceneAssetNode {
  /** Unique node identifier within the asset. */
  id: string;
  /** Node name for editor display. */
  name: string;
  /** Child node ids forming the hierarchy. */
  children: readonly string[];
  /** Local translation in world units. */
  translation: [number, number, number];
  /** Local rotation as Euler angles in radians (XYZ order). */
  rotation: [number, number, number];
  /** Local scale factors. */
  scale: [number, number, number];
  /** Optional mesh payload when this node carries geometry. */
  mesh?: EngineSceneAssetMesh;
  /** Optional material id reference binding a material to this node. */
  materialId?: string;
  /** Optional light entity when this node carries a light. */
  light?: EngineLightEntity;
}

/**
 * Declares one mesh payload inside a scene asset node.
 */
export interface EngineSceneAssetMesh {
  /** Packed vertex positions as [x,y,z, x,y,z, ...] in local space. */
  positions: readonly number[];
  /** Packed vertex normals as [nx,ny,nz, ...] in local space. */
  normals?: readonly number[];
  /** Packed vertex texture coordinates as [u,v, ...] in 0–1 range. */
  uvs?: readonly number[];
  /** Triangle indices into the vertex arrays. */
  indices?: readonly number[];
  /** Material id reference for this mesh primitive. */
  materialId?: string;
}
