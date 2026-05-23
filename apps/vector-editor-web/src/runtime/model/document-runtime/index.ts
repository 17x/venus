export {
  applyNormalizedGroupChildrenChange,
  applyNormalizedInsertShape,
  applyNormalizedRemoveShape,
  applyNormalizedShapeParentChange,
  createNormalizedRuntimeDocument,
  deriveGroupBoundsFromNormalizedRuntime,
  reconcileNormalizedStructuralStorage,
  type NormalizedRuntimeDocument,
  type NormalizedRuntimeNode,
} from './normalizedDocumentRuntime.ts'

export {
  EDITOR_DOCUMENT_SCHEMA_NAME,
  EDITOR_DOCUMENT_SCHEMA_MAJOR,
  EDITOR_DOCUMENT_SCHEMA_MINOR,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  collectDocumentInvariantViolations,
  evolveDocumentLifecycleState,
  isEditorDocumentInvariantSafe,
  normalizeEditorDocumentContract,
  type DocumentInvariantViolation,
  type EditorDocumentLifecycleTransitionContext,
} from './documentGovernance.ts'

export {
  createNormalizedGroupPatchPlan,
  runNormalizedGroupConsistencyQuickCheck,
  createNormalizedSiblingReorderPlan,
  createNormalizedUngroupPatchPlan,
  validateNormalizedDualWriteConsistency,
  type NormalizedGroupPatchPlan,
  type NormalizedGroupConsistencyDiagnostic,
  type NormalizedGroupConsistencyQuickCheckResult,
  type NormalizedSiblingReorderPlan,
  type NormalizedUngroupPatchPlan,
} from './normalizedHistoryPatches.ts'
