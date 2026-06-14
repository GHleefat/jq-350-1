import { useEffect, useRef, useCallback } from 'react';
import type { Point, AnyElement, LightSource, Mirror, Lens, Obstacle } from '../types';
import { useOpticsStore } from '../store/useOpticsStore';
import { distance, sub, pointInRect, add, rotate } from '../engine/geometry';

type InteractionMode =
  | 'none'
  | 'dragging'
  | 'rotating'
  | 'resizing'
  | 'placing';

interface DragState {
  mode: InteractionMode;
  elementId: string | null;
  startMouse: Point;
  startElementPos: Point;
  startRotation: number;
  startWidth: number;
  startHeight: number;
  handleType?: 'rotate' | 'end1' | 'end2' | 'corner';
  cornerIndex?: number;
}

function getElementAtPoint(elements: AnyElement[], p: Point): AnyElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (isPointInElement(p, el)) {
      return el;
    }
  }
  return null;
}

function isPointInElement(p: Point, el: AnyElement): boolean {
  switch (el.type) {
    case 'light':
      return distance(p, el.position) < 25;
    case 'mirror': {
      const mirror = el as Mirror;
      const half = mirror.width / 2;
      const start = add(el.position, rotate({ x: -half, y: 0 }, el.rotation));
      const end = add(el.position, rotate({ x: half, y: 0 }, el.rotation));
      const lineLen = distance(start, end);
      if (lineLen < 1) return false;
      const t = Math.max(0, Math.min(1, ((p.x - start.x) * (end.x - start.x) + (p.y - start.y) * (end.y - start.y)) / (lineLen * lineLen)));
      const projX = start.x + t * (end.x - start.x);
      const projY = start.y + t * (end.y - start.y);
      return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2) < 12;
    }
    case 'lens': {
      const lens = el as Lens;
      return distance(p, el.position) < lens.width / 2 + 20;
    }
    case 'obstacle': {
      const obs = el as Obstacle;
      return pointInRect(p, el.position, el.rotation, obs.width + 16, obs.height + 16);
    }
  }
  return false;
}

function isOnRotateHandle(p: Point, el: AnyElement): boolean {
  let radius = 50;
  if (el.type === 'mirror') radius = (el as Mirror).width / 2 + 30;
  if (el.type === 'lens') radius = (el as Lens).width / 2 + 30;
  if (el.type === 'obstacle') radius = Math.max((el as Obstacle).width, (el as Obstacle).height) / 2 + 30;
  const handlePos = add(el.position, rotate({ x: 0, y: -radius }, el.rotation));
  return distance(p, handlePos) < 12;
}

function getResizeHandle(p: Point, el: AnyElement): { type: string; index?: number } | null {
  if (el.type === 'mirror' || el.type === 'lens') {
    const w = el.type === 'mirror' ? (el as Mirror).width : (el as Lens).width;
    const half = w / 2;
    const end1 = add(el.position, rotate({ x: -half, y: 0 }, el.rotation));
    const end2 = add(el.position, rotate({ x: half, y: 0 }, el.rotation));
    if (distance(p, end1) < 10) return { type: 'end1' };
    if (distance(p, end2) < 10) return { type: 'end2' };
  }
  if (el.type === 'obstacle') {
    const obs = el as Obstacle;
    const hw = obs.width / 2 + 8;
    const hh = obs.height / 2 + 8;
    const corners = [
      { x: -hw, y: -hh }, { x: hw, y: -hh },
      { x: -hw, y: hh }, { x: hw, y: hh },
    ];
    for (let i = 0; i < 4; i++) {
      const c = add(el.position, rotate(corners[i], el.rotation));
      if (distance(p, c) < 10) return { type: 'corner', index: i };
    }
  }
  return null;
}

export function useCanvasInteraction(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const dragStateRef = useRef<DragState>({
    mode: 'none',
    elementId: null,
    startMouse: { x: 0, y: 0 },
    startElementPos: { x: 0, y: 0 },
    startRotation: 0,
    startWidth: 0,
    startHeight: 0,
  });

  const elements = useOpticsStore(s => s.elements);
  const activeTool = useOpticsStore(s => s.activeTool);
  const addElement = useOpticsStore(s => s.addElement);
  const updateElement = useOpticsStore(s => s.updateElement);
  const setSelectedId = useOpticsStore(s => s.setSelectedId);

  const getCanvasPos = useCallback((e: MouseEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [canvasRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const state = dragStateRef.current;
    const tool = activeTool;

    if (tool && tool !== 'select') {
      addElement(tool, pos);
      state.mode = 'placing';
      state.elementId = null;
      return;
    }

    const hoveredEl = getElementAtPoint(elements, pos);

    if (hoveredEl && hoveredEl.selected) {
      if (isOnRotateHandle(pos, hoveredEl)) {
        state.mode = 'rotating';
        state.elementId = hoveredEl.id;
        state.startMouse = pos;
        state.startRotation = hoveredEl.rotation;
        return;
      }

      const resizeHandle = getResizeHandle(pos, hoveredEl);
      if (resizeHandle) {
        state.mode = 'resizing';
        state.elementId = hoveredEl.id;
        state.startMouse = pos;
        state.handleType = resizeHandle.type as any;
        state.cornerIndex = resizeHandle.index;
        state.startWidth = hoveredEl.type === 'mirror' ? (hoveredEl as Mirror).width :
                           hoveredEl.type === 'lens' ? (hoveredEl as Lens).width :
                           hoveredEl.type === 'obstacle' ? (hoveredEl as Obstacle).width : 0;
        state.startHeight = hoveredEl.type === 'obstacle' ? (hoveredEl as Obstacle).height : 0;
        state.startElementPos = { ...hoveredEl.position };
        return;
      }
    }

    if (hoveredEl) {
      setSelectedId(hoveredEl.id);
      state.mode = 'dragging';
      state.elementId = hoveredEl.id;
      state.startMouse = pos;
      state.startElementPos = { ...hoveredEl.position };
    } else {
      setSelectedId(null);
    }
  }, [elements, activeTool, addElement, setSelectedId, getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const state = dragStateRef.current;

    if (state.mode === 'dragging' && state.elementId) {
      const delta = sub(pos, state.startMouse);
      const newPos = {
        x: state.startElementPos.x + delta.x,
        y: state.startElementPos.y + delta.y,
      };
      updateElement(state.elementId, { position: newPos });
    }

    if (state.mode === 'rotating' && state.elementId) {
      const el = elements.find(e => e.id === state.elementId);
      if (el) {
        const startAngle = Math.atan2(
          state.startMouse.y - el.position.y,
          state.startMouse.x - el.position.x
        );
        const currentAngle = Math.atan2(
          pos.y - el.position.y,
          pos.x - el.position.x
        );
        const delta = currentAngle - startAngle;
        updateElement(state.elementId, { rotation: state.startRotation + delta });
      }
    }

    if (state.mode === 'resizing' && state.elementId) {
      const el = elements.find(e => e.id === state.elementId);
      if (!el) return;

      if (state.handleType === 'end1' || state.handleType === 'end2') {
        const localMouse = rotate(sub(pos, state.startElementPos), -el.rotation);
        const localStart = rotate(sub(state.startMouse, state.startElementPos), -el.rotation);
        const delta = localMouse.x - localStart.x;
        let newWidth = state.startWidth;
        if (state.handleType === 'end2') {
          newWidth = state.startWidth + delta * 2;
        } else {
          newWidth = state.startWidth - delta * 2;
        }
        newWidth = Math.max(40, Math.min(newWidth, 600));
        if (el.type === 'mirror' || el.type === 'lens') {
          updateElement(state.elementId, { width: newWidth } as any);
        }
      }

      if (state.handleType === 'corner' && el.type === 'obstacle') {
        const localMouse = rotate(sub(pos, state.startElementPos), -el.rotation);
        const idx = state.cornerIndex || 0;
        const signX = idx % 2 === 0 ? -1 : 1;
        const signY = idx < 2 ? -1 : 1;
        const newWidth = Math.max(40, state.startWidth + signX * localMouse.x * 2);
        const newHeight = Math.max(40, state.startHeight + signY * localMouse.y * 2);
        updateElement(state.elementId, { width: Math.min(newWidth, 400), height: Math.min(newHeight, 400) } as any);
      }
    }
  }, [elements, updateElement, getCanvasPos]);

  const handleMouseUp = useCallback(() => {
    const state = dragStateRef.current;
    state.mode = 'none';
    state.elementId = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedId, deleteElement } = useOpticsStore.getState();
        if (selectedId) deleteElement(selectedId);
      }
      if (e.key === 'Escape') {
        useOpticsStore.getState().setActiveTool('select');
        useOpticsStore.getState().setSelectedId(null);
      }
      const toolMap: Record<string, any> = {
        'v': 'select',
        'l': 'light',
        'm': 'mirror',
        'n': 'lens',
        'b': 'obstacle',
      };
      if (toolMap[e.key.toLowerCase()]) {
        useOpticsStore.getState().setActiveTool(toolMap[e.key.toLowerCase()]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
