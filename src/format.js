export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(width, height) {
  return `${width}×${height} px`;
}

export function formatImageInfo(img) {
  const dimensions = formatDimensions(img.width, img.height);
  if (Number.isFinite(img.bytes) && img.bytes > 0) {
    return `${dimensions} · ${formatFileSize(img.bytes)}`;
  }
  return dimensions;
}

export function getSizeChange(img) {
  let percent = img?.sizeChangePercent;
  if (!Number.isFinite(percent)) {
    const sourceBytes = Number(img?.sourceBytes);
    const bytes = Number(img?.bytes);
    if (!(sourceBytes > 0) || !Number.isFinite(bytes)) return null;
    percent = Number((((bytes - sourceBytes) / sourceBytes) * 100).toFixed(1));
  }

  if (!Number.isFinite(percent)) return null;

  const rounded = Math.round(percent * 10) / 10;
  if (Math.abs(rounded) < 0.05) {
    return { percent: 0, direction: "same", label: "0%" };
  }

  if (rounded < 0) {
    const abs = Math.abs(rounded);
    return {
      percent: rounded,
      direction: "smaller",
      label: `−${abs}%`,
    };
  }

  return {
    percent: rounded,
    direction: "larger",
    label: `+${rounded}%`,
  };
}

export async function enrichWithFileSize(images) {
  return Promise.all(
    images.map(async (img) => {
      if (Number.isFinite(img.bytes) && img.bytes > 0) return img;

      try {
        const res = await fetch(img.url, { method: "HEAD" });
        const contentLength = res.headers.get("content-length");
        if (contentLength) {
          return { ...img, bytes: Number(contentLength) };
        }
      } catch {
        // ignore
      }

      return img;
    })
  );
}

export function formatSelectionSummary(selectedImages) {
  if (selectedImages.length === 0) return null;

  if (selectedImages.length === 1) {
    return formatImageInfo(selectedImages[0]);
  }

  const first = selectedImages[0];
  const sameSize = selectedImages.every(
    (img) => img.width === first.width && img.height === first.height
  );

  if (sameSize) {
    return `${selectedImages.length} снимки · ${formatDimensions(first.width, first.height)}`;
  }

  return `${selectedImages.length} снимки с различни размери`;
}
