import type {
  EngineConstraintPose,
  EngineConstraintPrimitive,
  EngineConstraintResolveOutput,
  EngineConstraintSet,
  EngineConstraintVec3,
  EngineConstraintViolation,
} from "./constraint.contract";

const DEFAULT_TOLERANCE = 1e-6;
const VECTOR_EPSILON = 1e-12;

interface MutableConstraintState {
  position: EngineConstraintVec3;
  scalar?: number;
}

interface RuleProjection {
  position?: EngineConstraintVec3;
  scalar?: number;
  angular?: boolean;
  degenerate?: boolean;
  missingScalar?: boolean;
}

/** Resolves one candidate pose/scalar against an ordered product-neutral constraint set. */
export function resolveEngineConstraintSet(
  set: EngineConstraintSet,
  candidate: EngineConstraintPose,
  scalar?: number,
): EngineConstraintResolveOutput {
  const tolerance = finiteNonNegative(set.tolerance, DEFAULT_TOLERANCE);
  const state: MutableConstraintState = {
    position: sanitizeVec3(candidate.position),
    ...(Number.isFinite(scalar) ? { scalar } : {}),
  };
  const initialPosition = state.position;
  const initialScalar = state.scalar;
  const activeConstraintIds: string[] = [];
  const violations: EngineConstraintViolation[] = [];
  let usesAngularScalar = false;
  const orderedRules = set.rules
    .map((rule, index) => ({ rule, index }))
    .sort((left, right) =>
      finiteNumber(right.rule.priority, 0) - finiteNumber(left.rule.priority, 0)
      || left.index - right.index,
    );

  for (const { rule } of orderedRules) {
    const projection = projectRule(rule.constraint, state);
    usesAngularScalar ||= projection.angular === true;
    if (projection.degenerate || projection.missingScalar) {
      violations.push({
        constraintId: rule.constraint.id,
        code: projection.missingScalar ? "missing-scalar" : "degenerate-geometry",
        correctionDistance: 0,
      });
      continue;
    }

    const weight = rule.mode === "soft"
      ? clamp(finiteNumber(rule.weight, 1), 0, 1)
      : 1;
    const nextPosition = projection.position
      ? mixVec3(state.position, projection.position, weight)
      : state.position;
    const nextScalar = projection.scalar !== undefined && state.scalar !== undefined
      ? projection.angular
        ? mixAngle(state.scalar, projection.scalar, weight)
        : mix(state.scalar, projection.scalar, weight)
      : state.scalar;
    const correction = distance(state.position, nextPosition)
      + (projection.angular
        ? angularDistance(state.scalar ?? 0, nextScalar ?? state.scalar ?? 0)
        : Math.abs((state.scalar ?? 0) - (nextScalar ?? state.scalar ?? 0)));

    if (correction > tolerance) {
      activeConstraintIds.push(rule.constraint.id);
      violations.push({
        constraintId: rule.constraint.id,
        code: "outside-tolerance",
        correctionDistance: correction,
      });
    }
    state.position = nextPosition;
    state.scalar = nextScalar;
  }

  const correctionDistance = distance(initialPosition, state.position)
    + (usesAngularScalar
      ? angularDistance(initialScalar ?? 0, state.scalar ?? initialScalar ?? 0)
      : Math.abs((initialScalar ?? 0) - (state.scalar ?? initialScalar ?? 0)));
  const hasHardFailure = violations.some((violation) =>
    violation.code === "degenerate-geometry" || violation.code === "missing-scalar",
  );

  return {
    status: hasHardFailure
      ? "unsatisfied"
      : correctionDistance > tolerance ? "corrected" : "satisfied",
    pose: { position: state.position },
    ...(state.scalar !== undefined ? { scalar: state.scalar } : {}),
    correctionDistance,
    activeConstraintIds,
    violations,
    iterations: orderedRules.length,
  };
}

function projectRule(
  constraint: EngineConstraintPrimitive,
  state: MutableConstraintState,
): RuleProjection {
  if (constraint.kind === "scalar-range" || constraint.kind === "angle-range") {
    if (state.scalar === undefined) {
      return { missingScalar: true };
    }
    return {
      scalar: constraint.kind === "angle-range"
        ? clampAngleRange(state.scalar, constraint.min, constraint.max)
        : clampRange(state.scalar, constraint.min, constraint.max),
      angular: constraint.kind === "angle-range",
    };
  }
  if (constraint.kind === "line") {
    return projectLine(state.position, constraint.origin, constraint.direction, false);
  }
  if (constraint.kind === "segment") {
    return projectLine(state.position, constraint.start, subtract(constraint.end, constraint.start), true);
  }
  if (constraint.kind === "plane") {
    const normal = normalize(constraint.normal);
    if (!normal) {
      return { degenerate: true };
    }
    const offset = dot(subtract(state.position, constraint.origin), normal);
    return { position: subtract(state.position, scale(normal, offset)) };
  }
  if (constraint.kind === "polyline") {
    return projectPolyline(state.position, constraint.points, constraint.loop === true);
  }

  const normal = normalize(constraint.normal);
  const radius = finiteNonNegative(constraint.radius, -1);
  if (!normal || radius < 0) {
    return { degenerate: true };
  }
  const toPoint = subtract(state.position, constraint.center);
  const planar = subtract(toPoint, scale(normal, dot(toPoint, normal)));
  const direction = normalize(planar) ?? perpendicular(normal);
  return { position: add(constraint.center, scale(direction, radius)) };
}

function projectPolyline(
  point: EngineConstraintVec3,
  points: readonly EngineConstraintVec3[],
  loop: boolean,
): RuleProjection {
  if (points.length < 2) {
    return { degenerate: true };
  }
  let nearest: EngineConstraintVec3 | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const segmentCount = loop ? points.length : points.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const start = sanitizeVec3(points[index]);
    const end = sanitizeVec3(points[(index + 1) % points.length]);
    const projection = projectLine(point, start, subtract(end, start), true);
    if (!projection.position) {
      continue;
    }
    const candidateDistance = distance(point, projection.position);
    if (candidateDistance < nearestDistance) {
      nearest = projection.position;
      nearestDistance = candidateDistance;
    }
  }
  return nearest ? { position: nearest } : { degenerate: true };
}

function projectLine(
  point: EngineConstraintVec3,
  origin: EngineConstraintVec3,
  directionInput: EngineConstraintVec3,
  clampToSegment: boolean,
): RuleProjection {
  const lengthSquared = dot(directionInput, directionInput);
  if (lengthSquared <= VECTOR_EPSILON) {
    return { degenerate: true };
  }
  const rawT = dot(subtract(point, origin), directionInput) / lengthSquared;
  const t = clampToSegment ? clamp(rawT, 0, 1) : rawT;
  return { position: add(origin, scale(directionInput, t)) };
}

function sanitizeVec3(value: EngineConstraintVec3): EngineConstraintVec3 {
  return {
    x: finiteNumber(value.x, 0),
    y: finiteNumber(value.y, 0),
    z: finiteNumber(value.z, 0),
  };
}

function perpendicular(normal: EngineConstraintVec3): EngineConstraintVec3 {
  const basis = Math.abs(normal.x) < 0.9
    ? { x: 1, y: 0, z: 0 }
    : { x: 0, y: 1, z: 0 };
  return normalize(cross(normal, basis)) ?? { x: 0, y: 0, z: 1 };
}

function clampRange(value: number, minInput?: number, maxInput?: number): number {
  const min = Number.isFinite(minInput) ? minInput as number : Number.NEGATIVE_INFINITY;
  const max = Number.isFinite(maxInput) ? maxInput as number : Number.POSITIVE_INFINITY;
  return clamp(value, Math.min(min, max), Math.max(min, max));
}

function clampAngleRange(value: number, minInput?: number, maxInput?: number): number {
  if (!Number.isFinite(minInput) || !Number.isFinite(maxInput)) {
    return normalizeAngle(value);
  }
  const angle = normalizeAngle(value);
  const min = normalizeAngle(minInput as number);
  const max = normalizeAngle(maxInput as number);
  const inside = min <= max
    ? angle >= min && angle <= max
    : angle >= min || angle <= max;
  if (inside) {
    return angle;
  }
  return angularDistance(angle, min) <= angularDistance(angle, max) ? min : max;
}

function normalizeAngle(value: number): number {
  const fullTurn = Math.PI * 2;
  return ((finiteNumber(value, 0) + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI;
}

function angularDistance(left: number, right: number): number {
  return Math.abs(normalizeAngle(left - right));
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function finiteNonNegative(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Math.max(0, value as number) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mix(start: number, end: number, weight: number): number {
  return start + (end - start) * weight;
}

function mixAngle(start: number, end: number, weight: number): number {
  return normalizeAngle(start + normalizeAngle(end - start) * weight);
}

function mixVec3(start: EngineConstraintVec3, end: EngineConstraintVec3, weight: number): EngineConstraintVec3 {
  return {
    x: mix(start.x, end.x, weight),
    y: mix(start.y, end.y, weight),
    z: mix(start.z, end.z, weight),
  };
}

function add(left: EngineConstraintVec3, right: EngineConstraintVec3): EngineConstraintVec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

function subtract(left: EngineConstraintVec3, right: EngineConstraintVec3): EngineConstraintVec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

function scale(value: EngineConstraintVec3, factor: number): EngineConstraintVec3 {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor };
}

function dot(left: EngineConstraintVec3, right: EngineConstraintVec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function cross(left: EngineConstraintVec3, right: EngineConstraintVec3): EngineConstraintVec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

function normalize(value: EngineConstraintVec3): EngineConstraintVec3 | null {
  const length = Math.sqrt(dot(value, value));
  return length <= VECTOR_EPSILON ? null : scale(value, 1 / length);
}

function distance(left: EngineConstraintVec3, right: EngineConstraintVec3): number {
  const delta = subtract(left, right);
  return Math.sqrt(dot(delta, delta));
}
