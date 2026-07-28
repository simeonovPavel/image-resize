export function computeFitRect(sourceWidth, sourceHeight, targetWidth, targetHeight, fit) {
  const sw = sourceWidth;
  const sh = sourceHeight;
  const tw = targetWidth;
  const th = targetHeight;

  switch (fit) {
    case "fill":
      return { sx: 0, sy: 0, sw, sh, dx: 0, dy: 0, dw: tw, dh: th };
    case "cover": {
      const scale = Math.max(tw / sw, th / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      return { sx: 0, sy: 0, sw, sh, dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh };
    }
    case "contain": {
      const scale = Math.min(tw / sw, th / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      return { sx: 0, sy: 0, sw, sh, dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh };
    }
    case "inside": {
      const scale = Math.min(tw / sw, th / sh, 1);
      const dw = sw * scale;
      const dh = sh * scale;
      return { sx: 0, sy: 0, sw, sh, dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh };
    }
    case "outside": {
      const scale = Math.max(tw / sw, th / sh);
      const dw = sw * scale;
      const dh = sh * scale;
      return { sx: 0, sy: 0, sw, sh, dx: (tw - dw) / 2, dy: (th - dh) / 2, dw, dh };
    }
    default:
      return computeFitRect(sourceWidth, sourceHeight, targetWidth, targetHeight, "cover");
  }
}

export function getPreviewCanvasSize(targetWidth, targetHeight, maxWidth = 180) {
  const safeW = Math.max(1, Number(targetWidth) || 1);
  const safeH = Math.max(1, Number(targetHeight) || 1);
  const displayWidth = maxWidth;
  const displayHeight = Math.max(56, Math.round((safeH / safeW) * displayWidth));
  const pixelRatio =
    typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 1) : 1;

  return {
    displayWidth,
    displayHeight,
    pixelWidth: Math.round(displayWidth * pixelRatio),
    pixelHeight: Math.round(displayHeight * pixelRatio),
  };
}

export function drawFitPreview(canvas, image, targetWidth, targetHeight, fit) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !image?.naturalWidth) return;

  const tw = Math.max(1, Number(targetWidth) || 1);
  const th = Math.max(1, Number(targetHeight) || 1);
  const cw = canvas.width;
  const ch = canvas.height;
  const scale = Math.min(cw / tw, ch / th);
  const offsetX = (cw - tw * scale) / 2;
  const offsetY = (ch - th * scale) / 2;

  const surface = getComputedStyle(document.documentElement)
    .getPropertyValue("--surface")
    .trim();

  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = surface || "#1c2638";
  ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = "#0a0e16";
  ctx.fillRect(offsetX, offsetY, tw * scale, th * scale);

  const rect = computeFitRect(image.naturalWidth, image.naturalHeight, tw, th, fit);
  ctx.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    offsetX + rect.dx * scale,
    offsetY + rect.dy * scale,
    rect.dw * scale,
    rect.dh * scale
  );

  ctx.strokeStyle = "rgba(122, 168, 232, 0.55)";
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX + 0.5, offsetY + 0.5, tw * scale - 1, th * scale - 1);
}
