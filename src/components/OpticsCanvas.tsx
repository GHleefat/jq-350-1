import { useRef, useEffect, useCallback } from 'react';
import { useOpticsStore } from '../store/useOpticsStore';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction';
import {
  drawBackground,
  drawGrid,
  drawRays,
  drawElement,
  drawNormals,
} from '../engine/renderer';

export function OpticsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const elements = useOpticsStore(s => s.elements);
  const settings = useOpticsStore(s => s.settings);
  const activeTool = useOpticsStore(s => s.activeTool);
  const setCanvasSize = useOpticsStore(s => s.setCanvasSize);

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useCanvasInteraction(canvasRef);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    drawBackground(ctx, w, h);

    if (settings.showGrid) {
      drawGrid(ctx, w, h);
    }

    drawRays(ctx, elements, settings);

    for (const el of elements) {
      drawElement(ctx, el);
    }

    if (settings.showNormals) {
      drawNormals(ctx, elements);
    }
  }, [elements, settings]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      setCanvasSize(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [setCanvasSize]);

  useEffect(() => {
    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  const getCursor = () => {
    if (activeTool && activeTool !== 'select') return 'crosshair';
    return 'default';
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ cursor: getCursor() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="glass-panel px-4 py-2">
          <h2 className="font-mono text-lab-cyan text-sm font-semibold tracking-wider">
            ⚡ 2D 光线追踪实验室
          </h2>
        </div>
      </div>
    </div>
  );
}
