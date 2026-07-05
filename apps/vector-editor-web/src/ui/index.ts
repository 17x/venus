/**
 * Vector Editor UI barrel.
 *
 * Primary source: @venus/ui/vector (vector-specific design system).
 * Engine-docs shared CSS tokens are imported via @venus/ui for visual alignment.
 *
 * AI-TEMP: When @venus/ui shared components cover all vector needs, switch to direct
 * @venus/ui exports; ref VECTOR_ENGINE_STRENGTHENING_REQUIREMENTS.md §9.
 */
export * from '@venus/ui/vector'

// Re-export shared @venus/ui utilities that vector doesn't wrap.
export { cn } from '@venus/ui'
