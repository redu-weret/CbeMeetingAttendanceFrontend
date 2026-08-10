import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, Move, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ImageCropperProps {
  /** URL of the image to edit (object URL or data URL) */
  imageUrl: string;
  /** Original file name — used to derive the cropped file name */
  fileName: string;
  /** Original file MIME type — decides JPEG vs PNG output */
  fileType: string;
  /** Disables the confirm button while the upload is in flight */
  isProcessing?: boolean;
  /** Called with the cropped File when the user confirms */
  onConfirm: (file: File) => void;
  /** Called when the user cancels the crop step */
  onCancel: () => void;
}

// Crop output resolution (square). 512 px keeps avatars sharp while staying
// well under the 5 MB upload limit even for high-quality JPEGs.
const OUTPUT_SIZE = 512;
// Zoom multipliers over "cover" fit (image fills the whole square).
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export function ImageCropper({
  imageUrl,
  fileName,
  fileType,
  isProcessing = false,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const { t } = useTranslation();
  // Keep the latest t in a ref so the image-loading effect (which must NOT
  // re-run on language change, or it would reset the in-progress crop) can
  // still translate the error message with the current language.
  const tRef = useRef(t);
  tRef.current = t;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState('');
  const [viewportSize, setViewportSize] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);
  const centeredRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; offX: number; offY: number } | null>(null);

  // Load the image (cancel-safe when the URL changes). Reset zoom / position
  // and drop the stale image so swapping files never flashes wrong dimensions.
  useEffect(() => {
    let cancelled = false;
    setImg(null);
    setLoadError('');
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    centeredRef.current = false;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setImg(image);
      setLoadError('');
      centeredRef.current = false; // re-center for the newly picked file
    };
    image.onerror = () => {
      if (cancelled) return;
      setLoadError(tRef.current('cropper.loadError'));
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Measure the square viewport so crop math matches the rendered size
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportSize(el.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scaleFor = useCallback(
    (z: number) => {
      if (!img || !viewportSize) return 1;
      return Math.max(viewportSize / img.naturalWidth, viewportSize / img.naturalHeight) * z;
    },
    [img, viewportSize]
  );

  const scale = scaleFor(zoom);

  // Center the image once the image + viewport are ready (keeps the focal
  // point stable while zooming, and fills the square at zoom = 1).
  useEffect(() => {
    if (!img || !viewportSize || centeredRef.current) return;
    centeredRef.current = true;
    const s = scaleFor(1);
    setOffset({
      x: (viewportSize - img.naturalWidth * s) / 2,
      y: (viewportSize - img.naturalHeight * s) / 2,
    });
  }, [img, viewportSize, scaleFor]);

  const clampOffset = useCallback(
    (x: number, y: number, s: number) => {
      if (!img || !viewportSize) return { x, y };
      const clampAxis = (value: number, content: number) => {
        if (content <= viewportSize) return (viewportSize - content) / 2; // centered letterbox
        return Math.min(0, Math.max(viewportSize - content, value));
      };
      return {
        x: clampAxis(x, img.naturalWidth * s),
        y: clampAxis(y, img.naturalHeight * s),
      };
    },
    [img, viewportSize]
  );

  const changeZoom = useCallback(
    (nextZoom: number) => {
      if (!img || !viewportSize) return;
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      if (z === zoom) return;
      const oldScale = scaleFor(zoom);
      const newScale = scaleFor(z);
      // Keep the pixel at the center of the viewport fixed while zooming
      const centerX = (viewportSize / 2 - offset.x) / oldScale;
      const centerY = (viewportSize / 2 - offset.y) / oldScale;
      setOffset(clampOffset(viewportSize / 2 - centerX * newScale, viewportSize / 2 - centerY * newScale, newScale));
      setZoom(z);
    },
    [img, viewportSize, zoom, offset, scaleFor, clampOffset]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!img) return;
    // Record the drag start first so panning still works if pointer capture
    // is unavailable (e.g. synthetic events); capture is only an enhancement.
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is optional — dragging continues without it
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const s = scaleFor(zoom);
    setOffset(clampOffset(drag.offX + (e.clientX - drag.startX), drag.offY + (e.clientY - drag.startY), s));
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    changeZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1));
  };

  const handleConfirm = () => {
    if (!img || !viewportSize) return;

    // Source rect (in natural image pixels) covered by the square viewport
    const sx = Math.max(0, Math.min(img.naturalWidth, -offset.x / scale));
    const sy = Math.max(0, Math.min(img.naturalHeight, -offset.y / scale));
    const sw = Math.min(viewportSize / scale, img.naturalWidth - sx);
    const sh = Math.min(viewportSize / scale, img.naturalHeight - sy);
    if (sw <= 0 || sh <= 0) return;

    // Keep transparency for PNG/WEBP, otherwise flatten to JPEG
    const keepAlpha = fileType === 'image/png' || fileType === 'image/webp';
    const outType = keepAlpha ? 'image/png' : 'image/jpeg';
    const ext = keepAlpha ? 'png' : 'jpg';

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!keepAlpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const base = fileName.replace(/\.[^.]+$/, '') || 'profile-picture';
      onConfirm(new File([blob], `${base}.${ext}`, { type: outType }));
    }, outType, 0.92);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {/* Crop viewport */}
        <div className="mx-auto sm:mx-0">
          <div
            ref={viewportRef}
            className="relative aspect-square w-64 sm:w-72 overflow-hidden rounded-2xl bg-gray-900 shadow-inner cursor-grab active:cursor-grabbing select-none touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={handleWheel}
            role="img"
            aria-label={t('cropper.previewLabel')}
          >
            {img && viewportSize > 0 && (
              <img
                src={imageUrl}
                alt={t('cropper.previewAlt')}
                draggable={false}
                className="absolute top-0 left-0 max-w-none pointer-events-none"
                style={{
                  width: img.naturalWidth * scale,
                  height: img.naturalHeight * scale,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                  willChange: 'transform',
                }}
              />
            )}

            {/* Rule-of-thirds grid */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
            </div>

            {!img && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-red-200">{loadError}</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">{t('cropper.sizeHint', { size: OUTPUT_SIZE })}</p>
        </div>

        {/* Controls */}
        <div className="w-full flex-1 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-gray-600">
              <span className="flex items-center gap-1"><ZoomIn className="h-3.5 w-3.5" /> {t('cropper.zoom')}</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeZoom(zoom - 0.25)}
                disabled={zoom <= MIN_ZOOM}
                aria-label={t('cropper.zoomOut')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                value={zoom}
                onChange={(e) => changeZoom(Number(e.target.value))}
                aria-label={t('cropper.zoomLevel')}
                className="flex-1 accent-blue-600"
              />
              <button
                type="button"
                onClick={() => changeZoom(zoom + 0.25)}
                disabled={zoom >= MAX_ZOOM}
                aria-label={t('cropper.zoomIn')}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-gray-500">
            <Move className="h-3.5 w-3.5" /> {t('cropper.dragHint')}
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button onClick={handleConfirm} isLoading={isProcessing} disabled={!img || !!loadError} icon={<Check className="h-4 w-4" />}>
              {t('cropper.usePhoto')}
            </Button>
            <Button variant="outline" onClick={onCancel} icon={<X className="h-4 w-4" />} disabled={isProcessing}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
