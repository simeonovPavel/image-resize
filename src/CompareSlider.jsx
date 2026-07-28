import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./CompareSlider.scss";

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Преди",
  afterLabel = "След",
  alt = "",
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef(null);
  const labelId = useId();

  const updateFromClientX = useCallback((clientX) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(96, Math.max(4, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return undefined;

    function onMove(event) {
      const point = event.touches?.[0] ?? event;
      updateFromClientX(point.clientX);
    }

    function onUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updateFromClientX]);

  if (!beforeSrc || !afterSrc) return null;

  return (
    <div className="compare-slider">
      <div
        ref={frameRef}
        className={`compare-frame ${dragging ? "dragging" : ""}`}
        onPointerDown={(event) => {
          setDragging(true);
          frameRef.current?.setPointerCapture?.(event.pointerId);
          updateFromClientX(event.clientX);
        }}
      >
        <img className="compare-layer" src={afterSrc} alt={alt || afterLabel} draggable={false} />
        <img
          className="compare-layer compare-before"
          src={beforeSrc}
          alt={alt || beforeLabel}
          draggable={false}
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        />
        <div className="compare-handle" style={{ left: `${position}%` }} aria-hidden="true">
          <span className="compare-handle-line" />
          <span className="compare-handle-knob" />
        </div>
        <span className="compare-tag before">{beforeLabel}</span>
        <span className="compare-tag after">{afterLabel}</span>
      </div>
      <label className="compare-range" htmlFor={labelId}>
        <span className="sr-only">Сравнение преди/след</span>
        <input
          id={labelId}
          type="range"
          min="4"
          max="96"
          value={Math.round(position)}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
