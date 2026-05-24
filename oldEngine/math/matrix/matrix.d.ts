export type Mat3 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
];
export interface Point2D {
    x: number;
    y: number;
}
export declare function applyMatrixToPoint(matrix: Mat3, point: Point2D): Point2D;
