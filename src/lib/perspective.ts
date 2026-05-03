/**
 * Perspective (homography) helpers.
 *
 * Given 4 source points (a quadrilateral the user outlined on their photo),
 * we compute a 3x3 homography that maps them to the 4 corners of a square,
 * then apply it via canvas to produce a flattened, square JPEG.
 */

export type Point = { x: number; y: number }
export type Quad = [Point, Point, Point, Point] // TL, TR, BR, BL

/**
 * Solve the linear system to find a 3x3 homography H such that for each
 * (sx, sy, 1) → λ (dx, dy, 1) up to scale.
 *
 * Standard "direct linear transform" derivation: 8 equations (2 per point),
 * 8 unknowns (h11..h32; h33 fixed at 1). Returns h as a 9-element array.
 */
export function homography(src: Quad, dst: Quad): number[] {
  const A: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x
    const sy = src[i].y
    const dx = dst[i].x
    const dy = dst[i].y
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx])
    b.push(dx)
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy])
    b.push(dy)
  }
  const h = solveLinearSystem(A, b)
  return [...h, 1] // h33 = 1
}

/** Inverse of a 3x3 matrix expressed as a 9-element row-major array. */
export function invert3x3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  if (Math.abs(det) < 1e-10) {
    // Degenerate quad — return identity so we degrade to "no transform".
    return [1, 0, 0, 0, 1, 0, 0, 0, 1]
  }
  const inv = 1 / det
  return [
    (e * i - f * h) * inv,
    (c * h - b * i) * inv,
    (b * f - c * e) * inv,
    (f * g - d * i) * inv,
    (a * i - c * g) * inv,
    (c * d - a * f) * inv,
    (d * h - e * g) * inv,
    (b * g - a * h) * inv,
    (a * e - b * d) * inv,
  ]
}

/** Apply 3x3 to a point and de-homogenize. */
export function applyHomography(m: number[], x: number, y: number): Point {
  const w = m[6] * x + m[7] * y + m[8]
  return {
    x: (m[0] * x + m[1] * y + m[2]) / w,
    y: (m[3] * x + m[4] * y + m[5]) / w,
  }
}

/**
 * Renders a perspective-corrected square crop of `img` to a canvas. The four
 * source-quad points are in image pixel coordinates. Output is `size` x `size`.
 *
 * Implementation: compute the inverse homography that maps destination pixels
 * back into the source, then for each output pixel sample the source via
 * canvas's drawImage. We use a CSS transform-style approach: build dst→src
 * inverse, walk the destination grid in 8-pixel tiles, and for each tile use
 * an affine approximation (cheap and accurate enough at small tile size).
 *
 * Pure-canvas pixel-by-pixel sampling is slow in JS; the tile approach trades
 * a tiny bit of accuracy for ~64x speedup.
 */
export async function warpPerspective(
  img: HTMLImageElement,
  srcQuad: Quad,
  size: number = 1024,
  quality: number = 0.85
): Promise<Blob> {
  const dstQuad: Quad = [
    { x: 0, y: 0 },
    { x: size, y: 0 },
    { x: size, y: size },
    { x: 0, y: size },
  ]
  const H = homography(dstQuad, srcQuad) // dst → src
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Walk in tiles. For each tile, compute the four src corners by applying H
  // and then draw using an affine transform that maps the src parallelogram
  // to the dst tile. Affine ≈ perspective at small tile size.
  const tile = 16
  for (let dy = 0; dy < size; dy += tile) {
    for (let dx = 0; dx < size; dx += tile) {
      const w = Math.min(tile, size - dx)
      const h = Math.min(tile, size - dy)
      // Map three dst corners into src and derive an affine transform.
      const p00 = applyHomography(H, dx, dy)
      const p10 = applyHomography(H, dx + w, dy)
      const p01 = applyHomography(H, dx, dy + h)
      // Affine that maps [(0,0),(w,0),(0,h)] → [p00, p10, p01]:
      // | a c e |   | x |
      // | b d f | * | y |
      const a = (p10.x - p00.x) / w
      const b = (p10.y - p00.y) / w
      const c = (p01.x - p00.x) / h
      const d = (p01.y - p00.y) / h
      const e = p00.x
      const f = p00.y

      // We want: dst pixel (dx+u, dy+v) ← src pixel (e+a*u+c*v, f+b*u+d*v).
      // Use ctx.setTransform to express the inverse: src → dst.
      // Inverse of [[a,c,e],[b,d,f]] in homogeneous form for the src→dst affine:
      const det = a * d - b * c
      if (Math.abs(det) < 1e-10) continue
      const ia = d / det
      const ib = -b / det
      const ic = -c / det
      const id = a / det
      // dst origin for the inverse = -(ia,ib,ic,id) * (e,f) + (dx,dy)
      const ie = -ia * e - ic * f + dx
      const iff = -ib * e - id * f + dy

      ctx.save()
      ctx.beginPath()
      ctx.rect(dx, dy, w, h)
      ctx.clip()
      ctx.setTransform(ia, ib, ic, id, ie, iff)
      ctx.drawImage(img, 0, 0)
      ctx.restore()
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * Solve A·x = b for x where A is n×n, via partial-pivoted Gaussian elimination.
 * Mutates A and b. Throws on singular matrix.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i
    let maxVal = Math.abs(A[i][i])
    for (let k = i + 1; k < n; k++) {
      const v = Math.abs(A[k][i])
      if (v > maxVal) {
        maxVal = v
        maxRow = k
      }
    }
    if (maxVal < 1e-12) {
      throw new Error('homography: singular matrix')
    }
    if (maxRow !== i) {
      ;[A[i], A[maxRow]] = [A[maxRow], A[i]]
      ;[b[i], b[maxRow]] = [b[maxRow], b[i]]
    }
    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i]
      for (let j = i; j < n; j++) {
        A[k][j] -= factor * A[i][j]
      }
      b[k] -= factor * b[i]
    }
  }
  // Back-substitute
  const x = new Array<number>(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i]
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]
    x[i] = s / A[i][i]
  }
  return x
}
