/**
 * Utility function to compress an image file using HTML5 Canvas before sending to AI Backend.
 * Reduces raw 5MB-10MB mobile photo down to ~100KB-200KB for maximum speed.
 */
export const compressImage = (
  file: File | Blob,
  maxWidth = 800,
  quality = 0.6
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
          return reject(new Error("Canvas 2D context unavailable"));
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export canvas as compressed image/jpeg with quality 0.6
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
