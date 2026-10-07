/**
 * Client-side browser image compression utility.
 * Downsizes images to a maximum dimension (default 1000px) and compresses to high-quality JPEG
 * before uploading to Supabase or submitting to APIs.
 * This guarantees snappy uploads (<200KB per photo) and prevents Fal.ai 9 Megapixel total area overflow.
 */
export async function compressImageClient(
  file: File,
  maxDimension: number = 640,
  quality: number = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve(file);
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            console.log(
              `Compressed '${file.name}' (${(file.size / 1024).toFixed(0)}KB) -> '${compressedFile.name}' (${(compressedFile.size / 1024).toFixed(0)}KB, ${width}x${height})`
            );
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
