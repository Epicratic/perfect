// Client-side image compressor to prevent exceeding Firestore (1MB) and localStorage (5MB) quotas

export function compressImageFile(file, maxWidth = 900, maxHeight = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      // Non-image file (e.g. PDF) -> read as base64
      const reader = new FileReader();
      reader.onload = (e) => resolve({ dataUrl: e.target.result, isImage: false, name: file.name, size: file.size });
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ dataUrl: compressedDataUrl, isImage: true, name: file.name, size: file.size });
      };
      img.onerror = () => {
        resolve({ dataUrl: e.target.result, isImage: true, name: file.name, size: file.size });
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
