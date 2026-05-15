/**
 * Normalize a user-selected image so the rest of the pipeline can decode it.
 *
 * iPhones still ship HEIC/HEIF by default. iOS Safari auto-converts when the
 * file comes straight from `<input capture>`, but the Photo Library picker
 * hands the raw HEIC through, and Chrome/Firefox/Android cannot decode it via
 * `<img>` / `createImageBitmap`. We convert to JPEG client-side so the
 * perspective editor, canvas, and backend all see the same format.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!looksLikeHeic(file)) return file

  // Lazy-load the WASM decoder so the bundle stays small for everyone else.
  const { heicTo } = await import('heic-to')
  const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
  const name = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg'
  return new File([jpeg], name, { type: 'image/jpeg', lastModified: file.lastModified })
}

function looksLikeHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif' || type === 'image/heic-sequence') {
    return true
  }
  // iOS sometimes leaves `type` empty when picking from the library — fall
  // back to the filename so we still catch it.
  if (type === '' || type === 'application/octet-stream') {
    return /\.(heic|heif)$/i.test(file.name)
  }
  return false
}
