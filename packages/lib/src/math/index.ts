export type {Mat3, Point2D} from './matrix.ts'
export {applyMatrixToPoint} from './matrix.ts'
export type {AffineAroundPointOptions, AffineMatrix} from './affineMatrix.ts'
export {
  applyAffineMatrixToPoint,
  createAffineMatrixAroundPoint,
  createIdentityAffineMatrix,
  createRotationAffineMatrix,
  createScaleAffineMatrix,
  createTranslationAffineMatrix,
  invertAffineMatrix,
  multiplyAffineMatrices,
} from './affineMatrix.ts'
export type { Mat4 } from './matrix4.ts'
export {
  composeMatrix4,
  createIdentityMatrix4,
  createRotationXMatrix4,
  createRotationYMatrix4,
  createRotationZMatrix4,
  createScaleMatrix4,
  createTranslationMatrix4,
  invertMatrix4,
  multiplyMatrices4,
  transformPoint3D,
} from './matrix4.ts'
export type { Quat } from './quaternion.ts'
export {
  createIdentityQuat,
  multiplyQuats,
  normalizeQuat,
  quatFromEuler,
  slerpQuats,
} from './quaternion.ts'
