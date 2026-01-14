import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { useLanguage } from '@/app/(app)/i18n';
import { getStudioTranslation } from '@/lib/i18n/studioTranslations';
import { SVGInfo, GridInfo, TileInfo } from '../types';

interface PreviewCanvasProps {
  svgInfo: SVGInfo | null;
  gridInfo: GridInfo | null;
  selectedTile: TileInfo | null;
  onTileSelect: (tile: TileInfo | null) => void;
}

export function PreviewCanvas({ svgInfo, gridInfo, selectedTile, onTileSelect }: PreviewCanvasProps) {
  const { locale } = useLanguage();
  const t = useCallback((key: string) => getStudioTranslation(locale as any, key), [locale]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgImageRef = useRef<HTMLImageElement | null>(null);
  const svgUrlRef = useRef<string | null>(null);
  const [svgRasterNonce, setSvgRasterNonce] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    svgImageRef.current = null;
    if (svgUrlRef.current) {
      URL.revokeObjectURL(svgUrlRef.current);
      svgUrlRef.current = null;
    }

    if (!svgInfo) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgInfo.originalContent, 'image/svg+xml');
      const svgEl = doc.querySelector('svg');

      if (svgEl) {
        const targetW = Math.max(300, Math.min(6000, Math.round(svgInfo.detectedWidthMm * 4)));
        const targetH = Math.max(300, Math.min(6000, Math.round(svgInfo.detectedHeightMm * 4)));
        svgEl.setAttribute('width', `${targetW}px`);
        svgEl.setAttribute('height', `${targetH}px`);
      }

      const serialized = new XMLSerializer().serializeToString(doc);
      const blob = new Blob([serialized], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      currentUrl = url;
      svgUrlRef.current = url;

      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          svgImageRef.current = img;
          setSvgRasterNonce((n) => n + 1);
        }
      };
      img.onerror = () => {
        if (!cancelled) {
          svgImageRef.current = null;
        }
      };
      img.src = url;
    } catch {
      svgImageRef.current = null;
    }

    return () => {
      cancelled = true;
      svgImageRef.current = null;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      svgUrlRef.current = null;
    };
  }, [svgInfo]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(100, Math.floor(rect.width));
        const newHeight = Math.max(100, Math.floor(rect.height - 50));
        setCanvasSize(prev => {
          if (prev.width === newWidth && prev.height === newHeight) return prev;
          return { width: newWidth, height: newHeight };
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Only fit view when svgInfo changes (not on every canvasSize change)
  const svgInfoIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!svgInfo) {
      svgInfoIdRef.current = null;
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    // Only auto-fit when a new SVG is loaded
    const svgId = `${svgInfo.detectedWidthMm}-${svgInfo.detectedHeightMm}`;
    if (svgInfoIdRef.current === svgId) return;
    svgInfoIdRef.current = svgId;

    const padding = 40;
    const scaleX = (canvasSize.width - padding * 2) / svgInfo.detectedWidthMm;
    const scaleY = (canvasSize.height - padding * 2) / svgInfo.detectedHeightMm;
    const fitZoom = Math.min(scaleX, scaleY, 2);
    
    zoomRef.current = fitZoom;
    panRef.current = {
      x: (canvasSize.width - svgInfo.detectedWidthMm * fitZoom) / 2,
      y: (canvasSize.height - svgInfo.detectedHeightMm * fitZoom) / 2,
    };
    setZoom(fitZoom);
    setPan(panRef.current);
  }, [svgInfo, canvasSize]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!svgInfo) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t('panel_splitter.preview.upload_svg_to_preview'), canvas.width / 2, canvas.height / 2);
      return;
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1 / zoom;
    ctx.fillRect(0, 0, svgInfo.detectedWidthMm, svgInfo.detectedHeightMm);
    ctx.strokeRect(0, 0, svgInfo.detectedWidthMm, svgInfo.detectedHeightMm);

    const img = svgImageRef.current;
    if (img) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, 0, 0, svgInfo.detectedWidthMm, svgInfo.detectedHeightMm);
    }

    if (gridInfo) {
      for (const tile of gridInfo.tiles) {
        const isSelected = selectedTile?.id === tile.id;
        
        ctx.strokeStyle = isSelected ? '#0ea5e9' : '#3b82f6';
        ctx.lineWidth = (isSelected ? 3 : 1.5) / zoom;
        ctx.setLineDash(isSelected ? [] : [5 / zoom, 5 / zoom]);
        
        ctx.strokeRect(tile.x, tile.y, gridInfo.effectiveTileWidth, gridInfo.effectiveTileHeight);

        if (isSelected) {
          ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
          ctx.fillRect(tile.x, tile.y, gridInfo.effectiveTileWidth, gridInfo.effectiveTileHeight);
        }

        ctx.setLineDash([]);
        ctx.fillStyle = isSelected ? '#0ea5e9' : '#3b82f6';
        ctx.font = `${Math.max(10, 14 / zoom)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const labelX = tile.x + gridInfo.effectiveTileWidth / 2;
        const labelY = tile.y + gridInfo.effectiveTileHeight / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        const textWidth = ctx.measureText(tile.label).width;
        ctx.fillRect(labelX - textWidth / 2 - 4, labelY - 10, textWidth + 8, 20);
        
        ctx.fillStyle = isSelected ? '#0ea5e9' : '#3b82f6';
        ctx.fillText(tile.label, labelX, labelY);
      }
    }

    ctx.restore();
  }, [gridInfo, pan, selectedTile, svgInfo, svgRasterNonce, t, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Don't select tile if user was panning
    if (hasDraggedRef.current) return;
    if (!gridInfo || !svgInfo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    for (const tile of gridInfo.tiles) {
      if (
        x >= tile.x &&
        x <= tile.x + gridInfo.effectiveTileWidth &&
        y >= tile.y &&
        y <= tile.y + gridInfo.effectiveTileHeight
      ) {
        onTileSelect(selectedTile?.id === tile.id ? null : tile);
        return;
      }
    }
    onTileSelect(null);
  };

  // Keep refs in sync with state (only update ref, don't trigger effects)
  zoomRef.current = zoom;
  panRef.current = pan;

  // Use native wheel event with passive: false to allow preventDefault
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const prevZoom = zoomRef.current;
      const newZoom = Math.max(0.1, Math.min(10, prevZoom * delta));
      const zoomRatio = newZoom / prevZoom;
      
      const prevPan = panRef.current;
      const newPan = {
        x: mouseX - (mouseX - prevPan.x) * zoomRatio,
        y: mouseY - (mouseY - prevPan.y) * zoomRatio,
      };
      
      setZoom(newZoom);
      setPan(newPan);
    };

    const handleMouseDownEvent = (e: MouseEvent) => {
      if (e.button === 0) {
        isPanningRef.current = true;
        hasDraggedRef.current = false;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMoveEvent = (e: MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasDraggedRef.current = true;
        }
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUpEvent = () => {
      isPanningRef.current = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDownEvent);
    canvas.addEventListener('mousemove', handleMouseMoveEvent);
    canvas.addEventListener('mouseup', handleMouseUpEvent);
    canvas.addEventListener('mouseleave', handleMouseUpEvent);

    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
      canvas.removeEventListener('mousedown', handleMouseDownEvent);
      canvas.removeEventListener('mousemove', handleMouseMoveEvent);
      canvas.removeEventListener('mouseup', handleMouseUpEvent);
      canvas.removeEventListener('mouseleave', handleMouseUpEvent);
    };
  }, []);

  return (
    <div ref={containerRef} className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-100">{t('preview.title')}</h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-300">{t('panel_splitter.preview.zoom_label')}</label>
          <input
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-slate-400 w-12">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => {
              if (svgInfo) {
                const padding = 40;
                const scaleX = (canvasSize.width - padding * 2) / svgInfo.detectedWidthMm;
                const scaleY = (canvasSize.height - padding * 2) / svgInfo.detectedHeightMm;
                const fitZoom = Math.min(scaleX, scaleY, 2);
                setZoom(fitZoom);
                setPan({
                  x: (canvasSize.width - svgInfo.detectedWidthMm * fitZoom) / 2,
                  y: (canvasSize.height - svgInfo.detectedHeightMm * fitZoom) / 2,
                });
              }
            }}
            className="text-sm text-sky-400 hover:text-sky-300"
          >
            {t('preview.fit_to_view')}
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden rounded-lg border border-gray-200 bg-white">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{ cursor: 'grab', display: 'block', touchAction: 'none' }}
          onClick={handleCanvasClick}
        />
      </div>

      {svgInfo && gridInfo && (
        <div className="mt-3 text-sm text-slate-400">
          {t('panel_splitter.preview.summary')
            .replace('{designW}', svgInfo.detectedWidthMm.toFixed(1))
            .replace('{designH}', svgInfo.detectedHeightMm.toFixed(1))
            .replace('{cols}', String(gridInfo.cols))
            .replace('{rows}', String(gridInfo.rows))}
        </div>
      )}
    </div>
  );
}
