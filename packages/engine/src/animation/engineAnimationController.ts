type EngineAnimationId = string;

/**
 * Declares one engine frame payload consumed by animation ticks.
 */
interface EngineFrameInfo {
	/** Monotonic frame timestamp in milliseconds. */
	now: number;
	/** Frame delta time in milliseconds. */
	dt: number;
}

/**
 * Declares built-in easing names supported by the animation controller.
 */
type EngineEasingName = "linear" | "easeIn" | "easeOut" | "easeInOut";

/**
 * Declares a runnable easing function.
 */
export type EngineEasingFunction = (t: number) => number;

/**
 * Declares accepted easing definitions: named presets or custom function.
 */
export type EngineEasingDefinition = EngineEasingName | EngineEasingFunction;

/**
 * Declares one animation specification tracked by the controller.
 */
interface EngineAnimationSpec<T = number> {
	/** Optional explicit animation id. */
	id?: EngineAnimationId;
	/** Start value. */
	from: T;
	/** End value. */
	to: T;
	/** Duration in milliseconds. */
	duration: number;
	/** Easing definition for progress shaping. */
	easing?: EngineEasingDefinition;
	/** Per-frame callback receiving current value and frame payload. */
	onUpdate: (value: T, frame: EngineFrameInfo) => void;
	/** Optional completion callback fired once at terminal progress. */
	onComplete?: () => void;
	/** Optional custom interpolation strategy. */
	interpolate?: (from: T, to: T, progress: number) => T;
}

/**
 * Declares the public animation controller contract.
 */
export interface EngineAnimationController {
	/** Starts one animation and returns its resolved id. */
	start<T>(spec: EngineAnimationSpec<T>): EngineAnimationId;
	/** Stops one animation by id. */
	stop(id: EngineAnimationId): void;
	/** Stops all active animations. */
	stopAll(): void;
	/** Advances all active animations for one frame. */
	tick(frame: EngineFrameInfo): void;
}

/**
 * Options for creating the canonical engine animation controller.
 */
interface EngineAnimationControllerOptions {
	/** Resolves a named/custom easing definition to a runnable easing function. */
	resolveEasing?: (easing: EngineEasingDefinition | undefined) => EngineEasingFunction;
	/** Produces animation ids when callers do not provide explicit ids. */
	idFactory?: () => EngineAnimationId;
}

interface ActiveAnimation {
	id: EngineAnimationId;
	spec: EngineAnimationSpec<unknown>;
	startedAt: number;
}

const EASE_IN_OUT_HALF = 0.5;
const EASE_IN_OUT_DOUBLE = 2;
const EASE_IN_OUT_NEGATIVE_DOUBLE = -2;

/**
 * Creates a canonical in-memory animation timeline that advances via external frame ticks.
 * @param options Optional easing/id strategy overrides for deterministic callers.
 */
export function createEngineAnimationController(
	options?: EngineAnimationControllerOptions,
): EngineAnimationController {
	const active = new Map<EngineAnimationId, ActiveAnimation>();
	const resolveEasing = options?.resolveEasing ?? resolveBuiltinEasing;
	const resolveId = options?.idFactory ?? createDefaultAnimationIdFactory();

	return {
		start: (spec) => {
			const id = spec.id ?? resolveId();
			active.set(id, {
				id,
				// Store as unknown because one controller tracks heterogeneous value payload types.
				spec: spec as EngineAnimationSpec<unknown>,
				startedAt: -1,
			});

			return id;
		},
		stop: (id) => {
			active.delete(id);
		},
		stopAll: () => {
			active.clear();
		},
		tick: (frame) => {
			if (active.size === 0) {
				return;
			}

			for (const [id, record] of active) {
				if (record.startedAt < 0) {
					record.startedAt = frame.now;
				}

				const duration = Math.max(0, record.spec.duration);
				if (duration === 0) {
					// Zero-duration animations emit a single deterministic terminal update.
					const finalValue = resolveInterpolatedValue(record.spec, 1);
					record.spec.onUpdate(finalValue, frame);
					record.spec.onComplete?.();
					active.delete(id);
					continue;
				}

				const elapsed = frame.now - record.startedAt;
				// Clamp to preserve interpolation stability when callers skip frames.
				const progress = Math.max(0, Math.min(1, elapsed / duration));
				const eased = resolveEasing(record.spec.easing)(progress);
				const value = resolveInterpolatedValue(record.spec, eased);

				record.spec.onUpdate(value, frame);

				if (progress >= 1) {
					record.spec.onComplete?.();
					active.delete(id);
				}
			}
		},
	};
}

/**
 * Resolves interpolation for one animation spec with default numeric fallback.
 * @param spec Animation specification for the active record.
 * @param progress Normalized progress in the inclusive range [0, 1].
 */
function resolveInterpolatedValue<T>(spec: EngineAnimationSpec<T>, progress: number): T {
	const interpolate = spec.interpolate ?? defaultInterpolate;
	return interpolate(spec.from, spec.to, progress);
}

/**
 * Provides deterministic interpolation for scalar values and stable generic fallbacks.
 * @param from Start value.
 * @param to End value.
 * @param progress Normalized progress in the inclusive range [0, 1].
 */
function defaultInterpolate<T>(from: T, to: T, progress: number): T {
	if (typeof from === "number" && typeof to === "number") {
		return (from + (to - from) * progress) as T;
	}

	if (progress >= 1) {
		return to;
	}

	return from;
}

/**
 * Normalizes easing input into one executable easing function.
 * @param easing Named easing preset or custom easing function.
 */
function resolveBuiltinEasing(easing: EngineEasingDefinition | undefined): EngineEasingFunction {
	if (typeof easing === "function") {
		return easing;
	}

	switch (easing) {
		case "easeIn":
			return (t) => t * t;
		case "easeOut":
			return (t) => 1 - (1 - t) * (1 - t);
		case "easeInOut":
			return (t) => (
				t < EASE_IN_OUT_HALF
					? EASE_IN_OUT_DOUBLE * t * t
					: 1 - ((EASE_IN_OUT_NEGATIVE_DOUBLE * t + EASE_IN_OUT_DOUBLE) ** EASE_IN_OUT_DOUBLE) / EASE_IN_OUT_DOUBLE
			);
		case "linear":
		default:
			return (t) => t;
	}
}

/**
 * Creates a monotonic animation id factory for callers without explicit ids.
 * @returns A closure that emits unique animation ids per controller instance.
 */
function createDefaultAnimationIdFactory() {
	let sequence = 0;

	return () => {
		sequence += 1;
		return `engine.animation.${sequence}`;
	};
}
