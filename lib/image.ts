/**
 * Client-side screenshot downscale for journal attachments: longest edge
 * capped (default 1280px), re-encoded as JPEG (default quality 0.8), and
 * returned as a data URL for the localStorage-backed provider. Keeping the
 * blobs small is what makes data-URL storage workable at all — production
 * uploads the original to object storage instead (see
 * lib/journal/localProvider.ts).
 */
export async function downscaleImageToDataUrl(
  file: File,
  maxEdge = 1280,
  quality = 0.8,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
