/**
 * Represents a 4x4 matrix in column-major order (16 elements).
 * Indices: [m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]
 * Column j, row i is at index i + j*4.
 */
export type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

/** Determinant epsilon threshold for singularity detection in matrix inversion. */
const INVERT_EPSILON = 1e-12;

/**
 * Creates a 4x4 identity matrix.
 */
export function createIdentityMatrix4(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Creates a 4x4 translation matrix from x, y, z offsets.
 * @param tx Translation along x-axis.
 * @param ty Translation along y-axis.
 * @param tz Translation along z-axis.
 */
export function createTranslationMatrix4(tx: number, ty: number, tz: number): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ];
}

/**
 * Creates a 4x4 scale matrix from x, y, z scale factors.
 * @param sx Scale factor along x-axis.
 * @param sy Scale factor along y-axis.
 * @param sz Scale factor along z-axis.
 */
export function createScaleMatrix4(sx: number, sy: number, sz: number): Mat4 {
  return [
    sx, 0, 0, 0,
    0, sy, 0, 0,
    0, 0, sz, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Creates a 4x4 rotation matrix around the x-axis.
 * @param angleRad Rotation angle in radians.
 */
export function createRotationXMatrix4(angleRad: number): Mat4 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Creates a 4x4 rotation matrix around the y-axis.
 * @param angleRad Rotation angle in radians.
 */
export function createRotationYMatrix4(angleRad: number): Mat4 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Creates a 4x4 rotation matrix around the z-axis.
 * @param angleRad Rotation angle in radians.
 */
export function createRotationZMatrix4(angleRad: number): Mat4 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

/**
 * Composes a 4x4 world matrix from translation, Euler rotation (XYZ order), and scale.
 * Transform order: Scale → Rotate X → Rotate Y → Rotate Z → Translate (right-to-left multiplication).
 * @param tx Translation x.
 * @param ty Translation y.
 * @param tz Translation z.
 * @param rx Rotation around x-axis in radians.
 * @param ry Rotation around y-axis in radians.
 * @param rz Rotation around z-axis in radians.
 * @param sx Scale along x-axis.
 * @param sy Scale along y-axis.
 * @param sz Scale along z-axis.
 */
export function composeMatrix4(
  tx: number, ty: number, tz: number,
  rx: number, ry: number, rz: number,
  sx: number, sy: number, sz: number,
): Mat4 {
  const T = createTranslationMatrix4(tx, ty, tz);
  const RX = createRotationXMatrix4(rx);
  const RY = createRotationYMatrix4(ry);
  const RZ = createRotationZMatrix4(rz);
  const S = createScaleMatrix4(sx, sy, sz);

  // Compose: T * RZ * RY * RX * S
  return multiplyMatrices4(
    T,
    multiplyMatrices4(
      RZ,
      multiplyMatrices4(
        RY,
        multiplyMatrices4(RX, S),
      ),
    ),
  );
}

/**
 * Multiplies two 4x4 matrices: result = left * right.
 * @param left Left-hand matrix operand.
 * @param right Right-hand matrix operand.
 */
export function multiplyMatrices4(left: Mat4, right: Mat4): Mat4 {
  const result: number[] = new Array(16);

  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) {
        // left[row + k*4] * right[k + col*4]
        sum += (left[row + k * 4] ?? 0) * (right[k + col * 4] ?? 0);
      }
      result[row + col * 4] = sum;
    }
  }

  return result as unknown as Mat4;
}

/**
 * Inverts a 4x4 matrix using Gauss-Jordan elimination.
 * Returns the identity matrix if the input is singular or nearly singular.
 * @param matrix 4x4 matrix to invert.
 */
export function invertMatrix4(matrix: Mat4): Mat4 {
  // Clone input into augmented matrix [A | I].
  const a: number[] = [...matrix];
  const inv: number[] = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  for (let col = 0; col < 4; col += 1) {
    // Find pivot row.
    let pivotRow = col;
    let maxAbs = Math.abs(a[col + col * 4] ?? 0);
    for (let row = col + 1; row < 4; row += 1) {
      const abs = Math.abs(a[col + row * 4] ?? 0);
      if (abs > maxAbs) {
        maxAbs = abs;
        pivotRow = row;
      }
    }

    // Singularity guard.
    if (maxAbs < INVERT_EPSILON) {
      return createIdentityMatrix4();
    }

    // Swap rows if needed.
    if (pivotRow !== col) {
      for (let j = 0; j < 4; j += 1) {
        const tmpA = a[j + col * 4];
        a[j + col * 4] = a[j + pivotRow * 4] ?? 0;
        a[j + pivotRow * 4] = tmpA ?? 0;

        const tmpInv = inv[j + col * 4];
        inv[j + col * 4] = inv[j + pivotRow * 4] ?? 0;
        inv[j + pivotRow * 4] = tmpInv ?? 0;
      }
    }

    // Normalize pivot row.
    const pivot = a[col + col * 4] ?? 1;
    for (let j = 0; j < 4; j += 1) {
      a[j + col * 4] = (a[j + col * 4] ?? 0) / pivot;
      inv[j + col * 4] = (inv[j + col * 4] ?? 0) / pivot;
    }

    // Eliminate other rows.
    for (let row = 0; row < 4; row += 1) {
      if (row === col) {
        continue;
      }
      const factor = a[col + row * 4] ?? 0;
      for (let j = 0; j < 4; j += 1) {
        a[j + row * 4] = (a[j + row * 4] ?? 0) - factor * (a[j + col * 4] ?? 0);
        inv[j + row * 4] = (inv[j + row * 4] ?? 0) - factor * (inv[j + col * 4] ?? 0);
      }
    }
  }

  return inv as unknown as Mat4;
}

/**
 * Transforms a 3D point by a 4x4 matrix (applies translation).
 * @param matrix 4x4 transform matrix.
 * @param x Point x coordinate.
 * @param y Point y coordinate.
 * @param z Point z coordinate.
 */
export function transformPoint3D(
  matrix: Mat4,
  x: number, y: number, z: number,
): { x: number; y: number; z: number } {
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  if (Math.abs(w) < 1e-12) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    y: (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
    z: (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
  };
}
