import type {
  Point,
  Vector,
  Ray,
  RaySegment,
  AnyElement,
  LightSource,
  Mirror,
  Lens,
  Obstacle,
  HitResult,
  GlobalSettings,
} from '../types';
import {
  add,
  sub,
  mul,
  normalize,
  rotate,
  reflect,
  refract,
  intersectElement,
  dot,
  EPS,
} from './geometry';

const MAX_DISTANCE = 5000;

function emitRaysFromLight(light: LightSource): Ray[] {
  const rays: Ray[] = [];
  const { position, rotation, rayCount, spreadAngle, intensity, wavelength } = light;

  const startAngle = rotation - spreadAngle / 2;
  const angleStep = spreadAngle / Math.max(rayCount - 1, 1);

  for (let i = 0; i < rayCount; i++) {
    const angle = startAngle + i * angleStep;
    const direction = rotate({ x: 1, y: 0 }, angle);
    rays.push({
      origin: { ...position },
      direction: normalize(direction),
      intensity,
      bounces: 0,
      wavelength,
    });
  }

  return rays;
}

function traceRay(
  ray: Ray,
  elements: AnyElement[],
  maxBounces: number,
  segments: RaySegment[]
): void {
  if (ray.bounces > maxBounces || ray.intensity < 0.01) return;

  let closestHit: HitResult | null = null;
  for (const element of elements) {
    if (element.type === 'light') continue;
    const hit = intersectElement(ray.origin, ray.direction, element);
    if (hit && hit.t > EPS && hit.t < MAX_DISTANCE && (!closestHit || hit.t < closestHit.t)) {
      closestHit = hit;
    }
  }

  if (!closestHit) {
    const endPoint = add(ray.origin, mul(ray.direction, MAX_DISTANCE));
    segments.push({
      start: { ...ray.origin },
      end: endPoint,
      intensity: ray.intensity,
      wavelength: ray.wavelength,
    });
    return;
  }

  segments.push({
    start: { ...ray.origin },
    end: { ...closestHit.point },
    intensity: ray.intensity,
    wavelength: ray.wavelength,
  });

  const { element, point, normal } = closestHit;

  switch (element.type) {
    case 'mirror': {
      const mirror = element as Mirror;
      const reflectedDir = reflect(ray.direction, normal);
      const newOrigin = add(point, mul(reflectedDir, EPS * 10));
      traceRay(
        {
          origin: newOrigin,
          direction: normalize(reflectedDir),
          intensity: ray.intensity * mirror.reflectivity,
          bounces: ray.bounces + 1,
          wavelength: ray.wavelength,
        },
        elements,
        maxBounces,
        segments
      );
      break;
    }
    case 'lens': {
      const lens = element as Lens;
      const n1 = 1.0;
      const n2 = lens.refractiveIndex;
      const eta = n1 / n2;
      const refractedDir = refract(ray.direction, normal, eta);

      if (refractedDir) {
        const insideOrigin = add(point, mul(refractedDir, EPS * 10));
        const insideHit = findLensExit(insideOrigin, normalize(refractedDir), lens);

        if (insideHit) {
          const etaBack = n2 / n1;
          const exitNormal = { x: -insideHit.normal.x, y: -insideHit.normal.y };
          const exitDir = refract(normalize(refractedDir), exitNormal, etaBack);

          if (exitDir) {
            segments.push({
              start: { ...insideOrigin },
              end: { ...insideHit.point },
              intensity: ray.intensity * 0.95,
              wavelength: ray.wavelength,
            });
            const newOrigin = add(insideHit.point, mul(exitDir, EPS * 10));
            traceRay(
              {
                origin: newOrigin,
                direction: normalize(exitDir),
                intensity: ray.intensity * 0.9,
                bounces: ray.bounces + 1,
                wavelength: ray.wavelength,
              },
              elements,
              maxBounces,
              segments
            );
          }
        }
      } else {
        const reflectedDir = reflect(ray.direction, normal);
        const newOrigin = add(point, mul(reflectedDir, EPS * 10));
        traceRay(
          {
            origin: newOrigin,
            direction: normalize(reflectedDir),
            intensity: ray.intensity * 0.5,
            bounces: ray.bounces + 1,
            wavelength: ray.wavelength,
          },
          elements,
          maxBounces,
          segments
        );
      }
      break;
    }
    case 'obstacle': {
      break;
    }
  }
}

function findLensExit(
  origin: Point,
  direction: Vector,
  lens: Lens
): { point: Point; normal: Vector } | null {
  const { position, rotation, width } = lens;
  const half = width / 2;

  const topPoint = add(position, rotate({ x: -half, y: 0 }, rotation));
  const bottomPoint = add(position, rotate({ x: half, y: 0 }, rotation));

  const v1 = sub(origin, topPoint);
  const v2 = sub(bottomPoint, topPoint);
  const v3 = { x: -direction.y, y: direction.x };
  const dotV2V3 = dot(v2, v3);

  if (Math.abs(dotV2V3) > EPS) {
    const t = (v2.x * v1.y - v2.y * v1.x) / dotV2V3;
    const u = (v1.x * v3.y - v1.y * v3.x) / dotV2V3;
    if (t > EPS * 10 && u >= 0 && u <= 1) {
      const point = add(origin, mul(direction, t));
      const tangent = normalize(v2);
      let normal = { x: -tangent.y, y: tangent.x };
      if (dot(normal, direction) > 0) {
        normal = { x: -normal.x, y: -normal.y };
      }
      return { point, normal };
    }
  }

  return null;
}

export function traceAllRays(
  elements: AnyElement[],
  settings: GlobalSettings
): RaySegment[] {
  const allSegments: RaySegment[] = [];
  const lights = elements.filter(e => e.type === 'light') as LightSource[];

  for (const light of lights) {
    const rays = emitRaysFromLight(light);
    for (const ray of rays) {
      traceRay(ray, elements, settings.maxBounces, allSegments);
    }
  }

  return allSegments;
}

export function wavelengthToColor(wavelength: number, intensity: number): string {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  const alpha = Math.min(1, intensity);
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}
