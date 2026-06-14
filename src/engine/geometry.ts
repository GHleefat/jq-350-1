import type { Point, Vector, AnyElement, Mirror, Lens, Obstacle, HitResult } from '../types';

export const EPS = 1e-6;

export function vec(x: number, y: number): Vector {
  return { x, y };
}

export function point(x: number, y: number): Point {
  return { x, y };
}

export function add(a: Point | Vector, b: Point | Vector): Vector {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point | Vector, b: Point | Vector): Vector {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function mul(v: Vector, s: number): Vector {
  return { x: v.x * s, y: v.y * s };
}

export function div(v: Vector, s: number): Vector {
  return { x: v.x / s, y: v.y / s };
}

export function dot(a: Vector, b: Vector): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vector, b: Vector): number {
  return a.x * b.y - a.y * b.x;
}

export function length(v: Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function normalize(v: Vector): Vector {
  const len = length(v);
  if (len < EPS) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function rotate(v: Vector, angle: number): Vector {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function reflect(d: Vector, n: Vector): Vector {
  const dn = dot(d, n);
  return { x: d.x - 2 * dn * n.x, y: d.y - 2 * dn * n.y };
}

export function refract(d: Vector, n: Vector, eta: number): Vector | null {
  const cosI = -dot(d, n);
  const sin2T = eta * eta * (1 - cosI * cosI);
  if (sin2T > 1) return null;
  const cosT = Math.sqrt(1 - sin2T);
  return {
    x: eta * d.x + (eta * cosI - cosT) * n.x,
    y: eta * d.y + (eta * cosI - cosT) * n.y,
  };
}

export function distance(a: Point, b: Point): number {
  return length(sub(a, b));
}

export function raySegmentIntersect(
  ro: Point,
  rd: Vector,
  a: Point,
  b: Point
): { t: number; point: Point; normal: Vector } | null {
  const v1 = sub(ro, a);
  const v2 = sub(b, a);
  const v3 = { x: -rd.y, y: rd.x };

  const dotV2V3 = dot(v2, v3);
  if (Math.abs(dotV2V3) < EPS) return null;

  const t = cross(v2, v1) / dotV2V3;
  const u = dot(v1, v3) / dotV2V3;

  if (t >= EPS && u >= 0 && u <= 1) {
    const point = add(ro, mul(rd, t));
    const tangent = normalize(v2);
    const normal = { x: -tangent.y, y: tangent.x };
    if (dot(normal, rd) > 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }
    return { t, point, normal };
  }
  return null;
}

export function rayRectIntersect(
  ro: Point,
  rd: Vector,
  center: Point,
  rotation: number,
  width: number,
  height: number
): { t: number; point: Point; normal: Vector } | null {
  const localRo = rotate(sub(ro, center), -rotation);
  const localRd = rotate(rd, -rotation);

  const hw = width / 2;
  const hh = height / 2;

  let tmin = -Infinity;
  let tmax = Infinity;
  let normalAxis: Vector | null = null;
  let normalSign = 1;

  for (let axis = 0; axis < 2; axis++) {
    const origin = axis === 0 ? localRo.x : localRo.y;
    const dir = axis === 0 ? localRd.x : localRd.y;
    const minVal = axis === 0 ? -hw : -hh;
    const maxVal = axis === 0 ? hw : hh;

    if (Math.abs(dir) < EPS) {
      if (origin < minVal || origin > maxVal) return null;
    } else {
      let t1 = (minVal - origin) / dir;
      let t2 = (maxVal - origin) / dir;
      let sign = -1;

      if (t1 > t2) {
        [t1, t2] = [t2, t1];
        sign = 1;
      }

      if (t1 > tmin) {
        tmin = t1;
        normalAxis = axis === 0 ? vec(1, 0) : vec(0, 1);
        normalSign = sign;
      }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return null;
    }
  }

  if (tmin < EPS) return null;

  const localPoint = add(localRo, mul(localRd, tmin));
  const worldPoint = add(rotate(localPoint, rotation), center);
  let localNormal = normalAxis ? mul(normalAxis, normalSign) : vec(0, -1);
  const worldNormal = normalize(rotate(localNormal, rotation));

  if (dot(worldNormal, rd) > 0) {
    worldNormal.x = -worldNormal.x;
    worldNormal.y = -worldNormal.y;
  }

  return { t: tmin, point: worldPoint, normal: worldNormal };
}

export function getElementEdges(element: AnyElement): { start: Point; end: Point }[] {
  const edges: { start: Point; end: Point }[] = [];
  const { position, rotation } = element;

  switch (element.type) {
    case 'mirror': {
      const mirror = element as Mirror;
      const half = mirror.width / 2;
      const start = add(position, rotate(vec(-half, 0), rotation));
      const end = add(position, rotate(vec(half, 0), rotation));
      edges.push({ start, end });
      break;
    }
    case 'lens': {
      const lens = element as Lens;
      const half = lens.width / 2;
      const top = add(position, rotate(vec(-half, 0), rotation));
      const bottom = add(position, rotate(vec(half, 0), rotation));
      edges.push({ start: top, end: bottom });
      edges.push({ start: bottom, end: top });
      break;
    }
    case 'obstacle': {
      const obs = element as Obstacle;
      const hw = obs.width / 2;
      const hh = obs.height / 2;
      const corners = [
        rotate(vec(-hw, -hh), rotation),
        rotate(vec(hw, -hh), rotation),
        rotate(vec(hw, hh), rotation),
        rotate(vec(-hw, hh), rotation),
      ].map(c => add(c, position));
      for (let i = 0; i < 4; i++) {
        edges.push({ start: corners[i], end: corners[(i + 1) % 4] });
      }
      break;
    }
  }
  return edges;
}

export function intersectElement(
  ro: Point,
  rd: Vector,
  element: AnyElement
): HitResult | null {
  if (element.type === 'light') return null;

  let result: { t: number; point: Point; normal: Vector } | null = null;

  if (element.type === 'obstacle') {
    const obs = element as Obstacle;
    result = rayRectIntersect(ro, rd, element.position, element.rotation, obs.width, obs.height);
  } else {
    const edges = getElementEdges(element);
    for (const edge of edges) {
      const hit = raySegmentIntersect(ro, rd, edge.start, edge.end);
      if (hit && (!result || hit.t < result.t)) {
        result = hit;
      }
    }
  }

  if (result) {
    return {
      point: result.point,
      normal: result.normal,
      distance: result.t,
      element,
      t: result.t,
    };
  }
  return null;
}

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const ap = sub(p, a);
  const t = Math.max(0, Math.min(1, dot(ap, ab) / Math.max(dot(ab, ab), EPS)));
  const proj = add(a, mul(ab, t));
  return distance(p, proj);
}

export function pointInRect(p: Point, center: Point, rotation: number, w: number, h: number): boolean {
  const local = rotate(sub(p, center), -rotation);
  return Math.abs(local.x) <= w / 2 && Math.abs(local.y) <= h / 2;
}
