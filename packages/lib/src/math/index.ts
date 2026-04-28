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
