/**
 * Renders the user-selected crop area to a square JPEG Blob suitable for
 * uploading as a tile. Capped at `maxSize` per side to keep payloads small —
 * the backend composer downsamples further per phase anyway.
 */
export async function cropImageToBlob(
  imageSrc: string,
  area: { x: number; y: number; width: number; height: number },
  options?: { maxSize?: number; quality?: number }
): Promise<Blob> {
  const maxSize = options?.maxSize ?? 1024
  const quality = options?.quality ?? 0.85

  const img = await loadImage(imageSrc)

  // Downscale if the cropped region would exceed maxSize on its longer side.
  const scale = Math.min(1, maxSize / Math.max(area.width, area.height))
  const out = Math.round(Math.max(area.width, area.height) * scale)

  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, out, out)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob returned null'))),
      'image/jpeg',
      quality
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Cropped from a same-origin object URL — no CORS dance needed, but set
    // anyway in case the source ever becomes a remote URL.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
