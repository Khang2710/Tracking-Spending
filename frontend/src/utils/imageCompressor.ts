/**
 * Modern HTML5 Canvas Image Compression Utility optimized for Mobile Web (iOS Safari & Android Chrome).
 * Uses URL.createObjectURL for instant memory-efficient camera photo loading and high-speed compression.
 */
export const compressImage = (
  file: File | Blob,
  maxWidth = 600,
  quality = 0.55
): Promise<string> => {
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      // Fallback if createObjectURL is not supported
      objectUrl = null;
    }

    const img = new Image();

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Proportional resize if image width exceeds maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          return reject(new Error("Canvas 2D context unavailable"));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export canvas as compressed image/jpeg
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        cleanup();
        resolve(compressedBase64);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    img.onerror = (err) => {
      cleanup();
      reject(err);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      // Fallback via FileReader if createObjectURL is unavailable
      const reader = new FileReader();
      reader.onload = (event) => {
        img.src = event.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
};
