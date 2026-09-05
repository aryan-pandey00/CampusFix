import { MAX_PHOTO_BYTES } from "./schema";

const MAX_EDGE = 1600; // plenty to read a cracked tile or a dead tube light
const QUALITY = 0.8;

/** Shrinks a photo in the browser before upload. */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // unreadable or exotic format — let the server judge

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob || blob.size >= file.size) return file; // no gain, keep the original

  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function photoProblem(file: File): string | null {
  if (file.size > MAX_PHOTO_BYTES) {
    return "That photo is over 5 MB even after compressing. Try another.";
  }
  return null;
}
