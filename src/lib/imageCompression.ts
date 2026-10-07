/**
 * Client-side browser image compression utility.
 * Downscales images to a maximum dimension (default 640px, matching the server-side
 * Fal pipeline budget) and re-encodes as high-quality JPEG before uploading to
 * Supabase or submitting to APIs.
 *
 * Behaviour:
 * - Non-image files are returned untouched.
 * - If the re-encoded result is not actually smaller than the input, the original
 *   file is returned so compression can never inflate the upload.
 * - Genuine failures (undecodable image, canvas/encode failure, aborted read)
 *   REJECT, so callers can surface the problem instead of silently uploading a
 *   multi-megabyte original.
 */
export class ImageCompressionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "ImageCompressionError";
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export async function compressImageClient(
  file: File,
  maxDimension: number = 640,
  quality: number = 0.85
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const compressedFile = await new Promise<File>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        try {
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
            reject(
              new ImageCompressionError(
                "Could not acquire a 2D canvas context to compress the image"
              )
            );
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(
                  new ImageCompressionError(
                    `Browser failed to encode '${file.name}' as JPEG`
                  )
                );
                return;
              }

              const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              resolve(
                new File([blob], cleanName, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
              );
            },
            "image/jpeg",
            quality
          );
        } catch (err) {
          reject(
            new ImageCompressionError(
              `Failed to compress '${file.name}'`,
              { cause: err }
            )
          );
        }
      };

      img.onerror = () =>
        reject(
          new ImageCompressionError(
            `'${file.name}' is not a decodable image. It may be corrupt or an unsupported format.`
          )
        );

      img.src = reader.result as string;
    };

    reader.onerror = () =>
      reject(
        new ImageCompressionError(`Failed to read '${file.name}' from disk`, {
          cause: reader.error,
        })
      );

    reader.readAsDataURL(file);
  });

  // Never hand back a "compressed" file that is larger than what we started with.
  if (compressedFile.size >= file.size) {
    console.warn(
      `Skipping compression for '${file.name}': re-encoded output (${(
        compressedFile.size / 1024
      ).toFixed(0)}KB) is not smaller than the original (${(
        file.size / 1024
      ).toFixed(0)}KB). Uploading the original instead.`
    );
    return file;
  }

  console.log(
    `Compressed '${file.name}' (${(file.size / 1024).toFixed(0)}KB) -> '${compressedFile.name}' (${(compressedFile.size / 1024).toFixed(0)}KB)`
  );
  return compressedFile;
}