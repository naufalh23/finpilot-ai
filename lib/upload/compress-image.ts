const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8
const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Downscales and re-encodes a receipt photo client-side before it ever leaves
 * the phone — receipts are read at a fraction of typical camera resolution,
 * so this cuts upload size (and Gemini's payload) without losing legibility.
 * PDFs and HEIC pass through unchanged: canvas can't decode either reliably
 * across browsers, and HEIC photos are usually small enough already.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    bitmap.close()
    return file
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  )

  // A compressed result that ended up larger (rare, but possible for already-
  // tiny or already-compressed source images) isn't worth swapping in.
  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.\w+$/, "") + ".jpg"
  return new File([blob], name, { type: "image/jpeg" })
}
