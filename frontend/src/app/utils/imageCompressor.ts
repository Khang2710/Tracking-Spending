import imageCompression from "browser-image-compression";

/**
 * Utility function to compress an image file using browser-image-compression.
 * Handles EXIF orientation (iPhone/Android mobile camera 90-degree photo rotation)
 * and reduces raw 5MB-10MB mobile photo down to ~40KB-100KB for maximum speed.
 */
export const compressImage = async (
  file: File | Blob,
  maxWidth = 600,
  quality = 0.55
): Promise<string> => {
  try {
    const fileToCompress =
      file instanceof File
        ? file
        : new File([file], "receipt.jpg", { type: file.type || "image/jpeg" });

    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: quality,
    };

    const compressedBlob = await imageCompression(fileToCompress, options);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(compressedBlob);
    });
  } catch (error) {
    console.warn("browser-image-compression failed, falling back to canvas compression:", error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return reject(new Error("Canvas 2D context unavailable"));
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = (err) => reject(err);
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
};
