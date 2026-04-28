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
  createNormalizedGroupPatchPlan,
  createNormalizedSiblingReorderPlan,
  createNormalizedUngroupPatchPlan,
  validateNormalizedDualWriteConsistency,
  type NormalizedGroupPatchPlan,
  type NormalizedSiblingReorderPlan,
  type NormalizedUngroupPatchPlan,
} from './normalizedHistoryPatches.ts'
