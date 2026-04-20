import { useEffect, useMemo, useRef, useState } from "react";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCoverMetrics(image, frame, zoom, pan) {
  const baseScale = Math.max(frame.width / image.width, frame.height / image.height);
  const scale = baseScale * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  const centeredX = (frame.width - drawWidth) / 2;
  const centeredY = (frame.height - drawHeight) / 2;

  const minPanX = frame.width - drawWidth - centeredX;
  const maxPanX = -centeredX;
  const minPanY = frame.height - drawHeight - centeredY;
  const maxPanY = -centeredY;

  const panX = clamp(pan.x, minPanX, maxPanX);
  const panY = clamp(pan.y, minPanY, maxPanY);

  return {
    x: centeredX + panX,
    y: centeredY + panY,
    drawWidth,
    drawHeight,
    panX,
    panY,
  };
}

function getContainMetrics(image, frame, zoom, pan) {
  const baseScale = Math.min(frame.width / image.width, frame.height / image.height);
  const scale = baseScale * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  const maxPanX = Math.max(0, (drawWidth - frame.width) / 2);
  const maxPanY = Math.max(0, (drawHeight - frame.height) / 2);

  const panX = maxPanX > 0 ? clamp(pan.x, -maxPanX, maxPanX) : 0;
  const panY = maxPanY > 0 ? clamp(pan.y, -maxPanY, maxPanY) : 0;

  return {
    x: (frame.width - drawWidth) / 2 + panX,
    y: (frame.height - drawHeight) / 2 + panY,
    drawWidth,
    drawHeight,
    panX,
    panY,
  };
}

function getFrameSize(aspectRatio) {
  const maxWidth = Math.min(window.innerWidth - 32, 780);
  const maxHeight = Math.min(window.innerHeight * 0.58, 460);
  let width = Math.max(260, maxWidth);
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

function exportVisibleRegion(image, frame, metrics, outputWidth = 1600) {
  const outputHeight = Math.max(1, Math.round((outputWidth * frame.height) / frame.width));
  const offscreen = document.createElement("canvas");
  offscreen.width = outputWidth;
  offscreen.height = outputHeight;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return "";

  const sx = clamp((-metrics.x / metrics.drawWidth) * image.width, 0, image.width - 1);
  const sy = clamp((-metrics.y / metrics.drawHeight) * image.height, 0, image.height - 1);
  const sw = clamp((frame.width / metrics.drawWidth) * image.width, 1, image.width - sx);
  const sh = clamp((frame.height / metrics.drawHeight) * image.height, 1, image.height - sy);

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  return offscreen.toDataURL("image/jpeg", 0.92);
}

export default function ImageCropModal({
  open,
  sourceFile,
  title,
  aspectRatio = 16 / 9,
  circularOverlay = false,
  mode = "framed",
  applyLabel = "Apply",
  onApply,
  onCancel,
}) {
  const canvasRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const pinchRef = useRef({ active: false, startDistance: 0, startZoom: 1 });

  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [frame, setFrame] = useState({ width: 640, height: 360 });

  useEffect(() => {
    if (!open) return;

    const recalc = () => {
      if (mode === "background") {
        setFrame({ width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) });
      } else {
        setFrame(getFrameSize(aspectRatio));
      }
    };

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [open, mode, aspectRatio]);

  useEffect(() => {
    if (!open || !sourceFile) {
      setImage(null);
      return;
    }

    const objectUrl = URL.createObjectURL(sourceFile);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => setImage(null);
    img.src = objectUrl;

    return () => URL.revokeObjectURL(objectUrl);
  }, [open, sourceFile]);

  const metrics = useMemo(() => {
    if (!image) return null;
    return mode === "background"
      ? getContainMetrics(image, frame, zoom, pan)
      : getCoverMetrics(image, frame, zoom, pan);
  }, [image, frame, zoom, pan, mode]);

  useEffect(() => {
    if (!image || !metrics) return;
    if (metrics.panX !== pan.x || metrics.panY !== pan.y) {
      setPan({ x: metrics.panX, y: metrics.panY });
    }
  }, [image, metrics, pan.x, pan.y]);

  useEffect(() => {
    if (!open || !image || !metrics || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = frame.width;
    canvas.height = frame.height;

    ctx.clearRect(0, 0, frame.width, frame.height);
    const bgColor = window.getComputedStyle(document.documentElement).getPropertyValue("--color-background").trim();
    ctx.fillStyle = bgColor || "black";
    ctx.fillRect(0, 0, frame.width, frame.height);
    ctx.drawImage(image, metrics.x, metrics.y, metrics.drawWidth, metrics.drawHeight);
  }, [open, image, metrics, frame]);

  useEffect(() => {
    if (!dragging || !image) return undefined;

    function onMouseMove(event) {
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      const candidate = { x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy };
      const next = mode === "background"
        ? getContainMetrics(image, frame, zoom, candidate)
        : getCoverMetrics(image, frame, zoom, candidate);
      setPan({ x: next.panX, y: next.panY });
    }

    function onMouseUp() {
      dragRef.current.active = false;
      setDragging(false);
    }

    function onTouchMove(event) {
      if (mode === "background" && event.touches.length === 2) {
        const [t0, t1] = event.touches;
        const distance = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (!pinchRef.current.active) {
          pinchRef.current = { active: true, startDistance: distance, startZoom: zoom };
        }
        const ratio = distance / Math.max(1, pinchRef.current.startDistance);
        setZoom(clamp(pinchRef.current.startZoom * ratio, 1, 3));
        event.preventDefault();
        return;
      }

      if (!dragRef.current.active) return;
      const touch = event.touches[0];
      if (!touch) return;

      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      const candidate = { x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy };
      const next = mode === "background"
        ? getContainMetrics(image, frame, zoom, candidate)
        : getCoverMetrics(image, frame, zoom, candidate);
      setPan({ x: next.panX, y: next.panY });
      event.preventDefault();
    }

    function onTouchEnd() {
      dragRef.current.active = false;
      pinchRef.current.active = false;
      setDragging(false);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, image, frame, zoom, mode]);

  function startDrag(clientX, clientY) {
    if (!image) return;
    dragRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
    setDragging(true);
  }

  function handleMouseDown(event) {
    event.preventDefault();
    startDrag(event.clientX, event.clientY);
  }

  function handleTouchStart(event) {
    if (mode === "background" && event.touches.length === 2) {
      const [t0, t1] = event.touches;
      pinchRef.current = {
        active: true,
        startDistance: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        startZoom: zoom,
      };
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    startDrag(touch.clientX, touch.clientY);
  }

  function handleWheel(event) {
    if (mode !== "background") return;
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 1, 3));
  }

  function handleApply() {
    if (!image || !metrics) return;
    const outputWidth = circularOverlay ? 1024 : 1920;
    const dataUrl = exportVisibleRegion(image, frame, metrics, outputWidth);
    if (!dataUrl) return;
    onApply?.(dataUrl);
  }

  if (!open || !sourceFile) return null;

  if (mode === "background") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black" onClick={onCancel}>
        <div className="relative h-full w-full" onClick={(event) => event.stopPropagation()}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onWheel={handleWheel}
            className="block h-full w-full select-none"
            style={{
              touchAction: "none",
              cursor: dragging ? "grabbing" : zoom > 1 ? "grab" : "default",
            }}
          />

          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="rounded-2xl border border-white/15 bg-black/55 backdrop-blur-md px-4 py-3 sm:px-5">
              <div className="mb-3 flex items-center gap-3">
                <label className="text-xs text-slate-300 whitespace-nowrap">Zoom {zoom.toFixed(1)}x</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  {applyLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center p-3 sm:p-5" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-4 sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-white text-base sm:text-lg font-semibold">{title ?? "Crop image"}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-2 py-1 text-slate-400 hover:text-white hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-2 sm:p-3">
          <div
            className="relative mx-auto overflow-hidden rounded-xl border border-white/10"
            style={{ width: frame.width, height: frame.height, maxWidth: "100%" }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              className="block h-full w-full select-none"
              style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
            />

            {circularOverlay && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-[90%] w-[90%] rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.48)]" />
              </div>
            )}
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-300">Zoom ({zoom.toFixed(1)}x)</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:from-teal-400 hover:to-emerald-400"
          >
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}