// Client-side image processor: resizes, center-crops, and compresses any uploaded photo
// into a lightweight, high-performance data URL.
// Storing this in PostgreSQL guarantees 100% compatibility with shared hosting
// (zero filesystem permission errors, zero lost uploads on deployment, zero external cloud costs).

export function processAvatarFile(
  file: File,
  targetSize: number = 256,
  quality: number = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(
        new Error("Please select a valid image file (PNG, JPG, WebP, or SVG)."),
      );
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        // Calculate center square crop to keep avatars perfectly proportioned
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        const canvas = document.createElement("canvas");
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable."));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw center-cropped square
        ctx.drawImage(
          img,
          sx,
          sy,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize,
        );

        // Try webp first for maximum compression; fallback to jpeg if unsupported
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
