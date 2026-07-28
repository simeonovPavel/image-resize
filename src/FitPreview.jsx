import { useEffect, useMemo, useRef } from "react";
import { drawFitPreview, getPreviewCanvasSize } from "./fitPreviewUtils";
import "./FitPreview.scss";

const FIT_PREVIEWS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "inside", label: "Inside" },
  { value: "outside", label: "Outside" },
];

function FitPreviewOption({ src, targetWidth, targetHeight, fit, label, active, onSelect }) {
  const canvasRef = useRef(null);
  const canvasSize = useMemo(
    () => getPreviewCanvasSize(targetWidth, targetHeight),
    [targetWidth, targetHeight]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const image = new Image();
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;
      drawFitPreview(canvas, image, targetWidth, targetHeight, fit);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [
    src,
    targetWidth,
    targetHeight,
    fit,
    canvasSize.pixelWidth,
    canvasSize.pixelHeight,
  ]);

  return (
    <button
      type="button"
      className={`fit-preview-option ${active ? "active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.pixelWidth}
        height={canvasSize.pixelHeight}
        className="fit-preview-canvas"
        style={{
          width: `${canvasSize.displayWidth}px`,
          height: `${canvasSize.displayHeight}px`,
        }}
      />
      <span>{label}</span>
    </button>
  );
}

function FitPreviewRow({ image, targetWidth, targetHeight, activeFit, onSelectFit }) {
  return (
    <div className="fit-preview-row">
      <div className="fit-preview-image-meta">
        <span className="fit-preview-name">{image.name}</span>
        <span className="fit-preview-original">
          {image.width}×{image.height} px
        </span>
      </div>
      <div className="fit-preview-options">
        {FIT_PREVIEWS.map((option) => (
          <FitPreviewOption
            key={option.value}
            src={image.url}
            targetWidth={targetWidth}
            targetHeight={targetHeight}
            fit={option.value}
            label={option.label}
            active={activeFit === option.value}
            onSelect={() => onSelectFit(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

export default function FitPreview({
  images,
  targetWidth,
  targetHeight,
  activeFit,
  onSelectFit,
  title,
  hint,
}) {
  const image = images[0];
  if (!image) return null;

  return (
    <section className="fit-preview">
      <div className="fit-preview-header">
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      <FitPreviewRow
        image={image}
        targetWidth={targetWidth}
        targetHeight={targetHeight}
        activeFit={activeFit}
        onSelectFit={onSelectFit}
      />
    </section>
  );
}
