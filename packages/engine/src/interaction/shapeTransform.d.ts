export interface Point {
    x: number;
    y: number;
}
export type AffineMatrix = [
    number,
    number,
    number,
    number,
    number,
    number
];
export interface BoxTransformSource {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface ShapeTransformRecord {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    flipX?: boolean;
    flipY?: boolean;
}
export interface NormalizedBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}
export interface NormalizedBoundsLike {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
export interface ResolvedNodeTransform {
    bounds: NormalizedBounds;
    center: Point;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
    matrix: AffineMatrix;
    inverseMatrix: AffineMatrix;
}
export interface MatrixFirstNodeTransform {
    matrix: AffineMatrix;
    bounds: NormalizedBounds;
    center: Point;
    width: number;
    height: number;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
}
export interface ShapeTransformBatchItem {
    id: string;
    fromMatrix: MatrixFirstNodeTransform;
    toMatrix: MatrixFirstNodeTransform;
}
export interface ShapeTransformBatchCommand {
    type: 'shape.transform.batch';
    transforms: ShapeTransformBatchItem[];
}
export interface ResolvedShapeTransformRecord extends ShapeTransformRecord {
    bounds: NormalizedBounds;
    center: Point;
    matrix: AffineMatrix;
    inverseMatrix: AffineMatrix;
}
export declare function createIdentityAffineMatrix(): AffineMatrix;
export declare function createTranslationAffineMatrix(tx: number, ty: number): AffineMatrix;
export declare function createScaleAffineMatrix(scaleX: number, scaleY: number): AffineMatrix;
export declare function createRotationAffineMatrix(rotationDegrees: number): AffineMatrix;
export declare function multiplyAffineMatrices(left: AffineMatrix, right: AffineMatrix): AffineMatrix;
export declare function invertAffineMatrix(matrix: AffineMatrix): AffineMatrix;
export declare function applyAffineMatrixToPoint(matrix: AffineMatrix, point: Point): Point;
export declare function createAffineMatrixAroundPoint(center: Point, options?: {
    rotationDegrees?: number;
    scaleX?: number;
    scaleY?: number;
}): AffineMatrix;
export declare function getNormalizedBoundsFromBox(x: number, y: number, width: number, height: number): NormalizedBounds;
export declare function doNormalizedBoundsOverlap(left: NormalizedBoundsLike, right: NormalizedBoundsLike): boolean;
export declare function intersectNormalizedBounds(left: NormalizedBoundsLike, right: NormalizedBoundsLike): NormalizedBoundsLike | null;
export declare function createShapeTransformRecord(source: BoxTransformSource): ShapeTransformRecord;
export declare function resolveNodeTransform(source: BoxTransformSource): ResolvedNodeTransform;
export declare function resolveShapeTransformRecord(source: BoxTransformSource): ResolvedShapeTransformRecord;
export declare function createMatrixFirstNodeTransform(source: BoxTransformSource): MatrixFirstNodeTransform;
export declare function toLegacyShapeTransformRecord(transform: Pick<MatrixFirstNodeTransform, 'bounds' | 'rotation' | 'flipX' | 'flipY' | 'width' | 'height'>): ShapeTransformRecord;
export declare function isPointInsideRotatedBounds(point: Point, bounds: Pick<NormalizedBounds, 'minX' | 'minY' | 'maxX' | 'maxY'>, rotationDegrees: number): boolean;
export declare function hasResolvedNodeTransformEffect(transform: ResolvedNodeTransform): boolean;
export declare function toResolvedNodeSvgTransform(transform: ResolvedNodeTransform): string | undefined;
export declare function toResolvedNodeCssTransform(transform: ResolvedNodeTransform): string | undefined;
