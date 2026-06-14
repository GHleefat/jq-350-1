import type {
  AnyElement,
  LightSource,
  Mirror,
  Lens,
  Obstacle,
  RaySegment,
  GlobalSettings,
} from '../types';
import { traceAllRays, wavelengthToColor } from './raytracer';
import { add, rotate, getElementEdges } from './geometry';

export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gridSize = 50;
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.06)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(0, 245, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
}

export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, '#0f0f2a');
  gradient.addColorStop(1, '#050510');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 0; i < 60; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const px = Math.abs(x) * width;
    const py = Math.abs(y) * height;
    const size = Math.abs((Math.sin(i * 43.1) * 2)) + 0.5;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawRays(
  ctx: CanvasRenderingContext2D,
  elements: AnyElement[],
  settings: GlobalSettings
): RaySegment[] {
  const segments = traceAllRays(elements, settings);

  for (const seg of segments) {
    const color = wavelengthToColor(seg.wavelength, seg.intensity);

    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = seg.intensity * 0.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = seg.intensity * 0.15;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = Math.min(1, seg.intensity);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  return segments;
}

export function drawLightSource(ctx: CanvasRenderingContext2D, light: LightSource) {
  const { position, rotation, spreadAngle, color, selected } = light;

  const glowRadius = 40;
  const gradient = ctx.createRadialGradient(
    position.x, position.y, 0,
    position.x, position.y, glowRadius
  );
  gradient.addColorStop(0, `${color}aa`);
  gradient.addColorStop(0.3, `${color}44`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  const startAngle = -spreadAngle / 2;
  const endAngle = spreadAngle / 2;
  ctx.fillStyle = `${color}22`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 60, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
  ctx.fill();

  if (selected) {
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(position.x, position.y, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawMirror(ctx: CanvasRenderingContext2D, mirror: Mirror) {
  const { position, rotation, width, selected } = mirror;
  const half = width / 2;

  const start = add(position, rotate({ x: -half, y: 0 }, rotation));
  const end = add(position, rotate({ x: half, y: 0 }, rotation));

  const perp = rotate({ x: 0, y: 6 }, rotation);

  const backStart = { x: start.x + perp.x, y: start.y + perp.y };
  const backEnd = { x: end.x + perp.x, y: end.y + perp.y };

  ctx.fillStyle = '#2a3a4a';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.lineTo(backEnd.x, backEnd.y);
  ctx.lineTo(backStart.x, backStart.y);
  ctx.closePath();
  ctx.fill();

  const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
  grad.addColorStop(0, '#88ccff');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, '#88ccff');

  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#88ccff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (selected) {
    drawSelectionHandles(ctx, position, rotation, half);
  }
}

export function drawLens(ctx: CanvasRenderingContext2D, lens: Lens) {
  const { position, rotation, width, isConvex, selected } = lens;
  const half = width / 2;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  ctx.fillStyle = isConvex ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 100, 200, 0.15)';
  ctx.strokeStyle = isConvex ? 'rgba(0, 245, 255, 0.8)' : 'rgba(255, 100, 200, 0.8)';
  ctx.lineWidth = 2;

  const curvature = isConvex ? 25 : -25;

  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.quadraticCurveTo(curvature, 0, 0, half);
  ctx.quadraticCurveTo(-curvature, 0, 0, -half);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isConvex ? 'rgba(0, 245, 255, 0.08)' : 'rgba(255, 100, 200, 0.08)';
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.abs(curvature) * 0.6, half * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (selected) {
    drawSelectionHandles(ctx, position, rotation, half);
  }
}

export function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  const { position, rotation, width, height, selected } = obstacle;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  const grad = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  grad.addColorStop(0, '#3a3a5a');
  grad.addColorStop(1, '#1a1a2a');
  ctx.fillStyle = grad;

  const hw = width / 2;
  const hh = height / 2;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, width, height, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 100, 100, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-hw + 8, -hh + 8);
  ctx.lineTo(hw - 8, hh - 8);
  ctx.moveTo(hw - 8, -hh + 8);
  ctx.lineTo(-hw + 8, hh - 8);
  ctx.stroke();

  ctx.restore();

  if (selected) {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(rotation);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const hw = width / 2 + 8;
    const hh = height / 2 + 8;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, width + 16, height + 16, 8);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#00f5ff';
    const handles = [
      { x: -hw, y: -hh }, { x: hw, y: -hh },
      { x: -hw, y: hh }, { x: hw, y: hh },
    ];
    for (const h of handles) {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    drawRotateHandle(ctx, position, rotation, Math.max(width, height) / 2 + 30);
  }
}

function drawSelectionHandles(ctx: CanvasRenderingContext2D, position: { x: number; y: number }, rotation: number, half: number) {
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(rotation);

  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(-half - 8, -15);
  ctx.lineTo(half + 8, -15);
  ctx.lineTo(half + 8, 15);
  ctx.lineTo(-half - 8, 15);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#00f5ff';
  const handles = [
    { x: -half, y: 0 },
    { x: half, y: 0 },
  ];
  for (const h of handles) {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  drawRotateHandle(ctx, position, rotation, half + 30);
}

function drawRotateHandle(ctx: CanvasRenderingContext2D, position: { x: number; y: number }, rotation: number, distance: number) {
  const handlePos = add(position, rotate({ x: 0, y: -distance }, rotation));
  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(position.x, position.y);
  ctx.lineTo(handlePos.x, handlePos.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#00f5ff';
  ctx.beginPath();
  ctx.arc(handlePos.x, handlePos.y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a0a1a';
  ctx.beginPath();
  ctx.arc(handlePos.x, handlePos.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawNormals(ctx: CanvasRenderingContext2D, elements: AnyElement[]) {
  for (const el of elements) {
    if (el.type === 'light') continue;
    const edges = getElementEdges(el);
    for (const edge of edges) {
      const midX = (edge.start.x + edge.end.x) / 2;
      const midY = (edge.start.y + edge.end.y) / 2;
      const dx = edge.end.x - edge.start.x;
      const dy = edge.end.y - edge.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const nx = -dy / len;
      const ny = dx / len;

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + nx * 25, midY + ny * 25);
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(midX + nx * 25, midY + ny * 25, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawElement(ctx: CanvasRenderingContext2D, element: AnyElement) {
  switch (element.type) {
    case 'light':
      drawLightSource(ctx, element as LightSource);
      break;
    case 'mirror':
      drawMirror(ctx, element as Mirror);
      break;
    case 'lens':
      drawLens(ctx, element as Lens);
      break;
    case 'obstacle':
      drawObstacle(ctx, element as Obstacle);
      break;
  }
}
