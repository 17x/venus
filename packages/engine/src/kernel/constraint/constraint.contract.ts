/** Product-neutral 3D vector used by constraint evaluation. */
export interface EngineConstraintVec3 {
  x: number;
  y: number;
  z: number;
}

/** Product-neutral pose candidate resolved by constraints. */
export interface EngineConstraintPose {
  position: EngineConstraintVec3;
}

/** Supported deterministic projection primitives. */
export type EngineConstraintPrimitive =
  | { id: string; kind: "line"; origin: EngineConstraintVec3; direction: EngineConstraintVec3 }
  | { id: string; kind: "segment"; start: EngineConstraintVec3; end: EngineConstraintVec3 }
  | { id: string; kind: "plane"; origin: EngineConstraintVec3; normal: EngineConstraintVec3 }
  | { id: string; kind: "circle"; center: EngineConstraintVec3; normal: EngineConstraintVec3; radius: number }
  | { id: string; kind: "polyline"; points: readonly EngineConstraintVec3[]; loop?: boolean }
  | { id: string; kind: "scalar-range"; min?: number; max?: number }
  | {
    id: string;
    kind: "angle-range";
    /** Inclusive minimum angle in radians. Values greater than max define a wrapped interval. */
    min?: number;
    /** Inclusive maximum angle in radians. Values lower than min define a wrapped interval. */
    max?: number;
  };

/** One ordered rule in a constraint set. */
export interface EngineConstraintRule {
  constraint: EngineConstraintPrimitive;
  mode?: "hard" | "soft";
  priority?: number;
  weight?: number;
}

/** Registered or transient constraint-set contract. */
export interface EngineConstraintSet {
  id: string;
  rules: readonly EngineConstraintRule[];
  tolerance?: number;
}

/** Candidate state submitted to deterministic constraint resolution. */
export interface EngineConstraintResolveInput {
  constraintSetId: string;
  candidate: EngineConstraintPose;
  scalar?: number;
}

/** Structured violation emitted without product-specific semantics. */
export interface EngineConstraintViolation {
  constraintId: string;
  code: "degenerate-geometry" | "missing-scalar" | "missing-constraint-set" | "outside-tolerance";
  correctionDistance: number;
}

/** Deterministic result returned by constraint resolution. */
export interface EngineConstraintResolveOutput {
  status: "satisfied" | "corrected" | "unsatisfied";
  pose: EngineConstraintPose;
  scalar?: number;
  correctionDistance: number;
  activeConstraintIds: readonly string[];
  violations: readonly EngineConstraintViolation[];
  iterations: number;
}

/** Constraint-set unregister result. */
export interface EngineConstraintUnregisterOutput {
  removed: boolean;
  constraintSetCount: number;
}

/** Runtime constraint namespace exposed under engine.runtime.constraints. */
export interface EngineRuntimeConstraintApi {
  register: (set: EngineConstraintSet) => EngineConstraintSet;
  unregister: (constraintSetId: string) => EngineConstraintUnregisterOutput;
  get: (constraintSetId: string) => EngineConstraintSet | null;
  getAll: () => readonly EngineConstraintSet[];
  resolve: (input: EngineConstraintResolveInput) => EngineConstraintResolveOutput;
}
