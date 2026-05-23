/**
 * Backend mode contract used by protocol/backend boundaries.
 */
export type EngineProtocolBackendMode = "auto" | "webgpu" | "webgl" | "canvas2d" | "headless";

/**
 * Backend mode subset that always resolves to concrete execution mode.
 */
export type EngineProtocolResolvedBackendMode = Exclude<EngineProtocolBackendMode, "auto">;
