// 画像をアップロード前にCanvas経由で圧縮し、転送量を削減する。
// 解析後はbase64文字列のみがサーバーへ送られ、元ファイルは保存されない。

export async function compressImage(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const longer = Math.max(img.width, img.height);
      const scale = longer > maxDim ? maxDim / longer : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas作成失敗'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('画像変換失敗'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result);
            const base64 = dataUrl.split(',')[1] || '';
            resolve({ base64, mediaType: blob.type || 'image/jpeg' });
          };
          reader.onerror = () => reject(new Error('FileReaderエラー'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像読み込み失敗'));
    };

    img.src = url;
  });
}
