/**
 * Runtime render entrypoint for layered draw-command composition and scene rendering.
 * Exposes behavior APIs under render domain without requiring caller knowledge of core paths.
 */
export {
  composeLayeredDrawCommands,
} from '../core/compose.ts'
export {
  renderLayeredScene,
} from '../core/render.ts'
