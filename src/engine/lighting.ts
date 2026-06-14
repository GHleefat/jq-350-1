import type {
  Point,
  Vector,
  AnyElement,
  LightSource,
  Obstacle,
  GlobalSettings,
} from '../types';
import {
  add,
  sub,
  mul,
  normalize,
  rotate,
  intersectElement,
  EPS,
  dot,
} from './geometry';

const SCALE = 2;
const LIGHT_RAY_COUNT = 80;
const ACCUMULATION_FRAMES = 8;

export class LightingAccumulator {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private width: number = 0;
  private height: number = 0;
  private scaledWidth: number = 0;
  private scaledHeight: number = 0;
  private lightBuffer: Float32Array | null = null;
  private accumulationCount: number = 0;
  private lastElementsHash: string = '';
  private frameCount: number = 0;

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.scaledWidth = Math.ceil(width / SCALE);
    this.scaledHeight = Math.ceil(height / SCALE);

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
    this.offscreenCanvas.width = this.scaledWidth;
    this.offscreenCanvas.height = this.scaledHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    const bufSize = this.scaledWidth * this.scaledHeight * 3;
    if (!this.lightBuffer || this.lightBuffer.length !== bufSize) {
      this.lightBuffer = new Float32Array(bufSize);
    }
    this.reset();
  }

  private getElementsHash(elements: AnyElement[]): string {
    return elements.map(e =>
      `${e.id}:${e.position.x.toFixed(1)},${e.position.y.toFixed(1)},${e.rotation.toFixed(3)}`
    ).join('|');
  }

  compute(elements: AnyElement[], settings: GlobalSettings) {
    if (!this.lightBuffer || !this.offscreenCtx) return;

    const hash = this.getElementsHash(elements);
    if (hash !== this.lastElementsHash) {
      this.reset();
      this.lastElementsHash = hash;
    }

    if (this.accumulationCount >= ACCUMULATION_FRAMES) {
      this.renderBufferToCanvas();
      return;
    }

    this.frameCount++;

    const lights = elements.filter(e => e.type === 'light') as LightSource[];

    for (const light of lights) {
      this.computeLightContribution(light, elements, settings);
    }

    this.accumulationCount++;
    this.renderBufferToCanvas();
  }

  private computeLightContribution(
    light: LightSource,
    elements: AnyElement[],
    settings: GlobalSettings
  ) {
    if (!this.lightBuffer) return;

    const { position, rotation, spreadAngle, intensity, wavelength } = light;
    const color = this.wavelengthToRGB(wavelength);
    const seedOffset = this.frameCount * 0.618033988749895;

    for (let i = 0; i < LIGHT_RAY_COUNT; i++) {
      const t = ((i + seedOffset) % 1 + 1) % 1;
      const angleOffset = (t - 0.5) * spreadAngle;
      const angle = rotation + angleOffset;
      const dir = normalize(rotate({ x: 1, y: 0 }, angle));

      this.traceLightRay(
        position,
        dir,
        intensity * (1 - Math.abs(angleOffset) / spreadAngle * 0.5),
        color,
        elements,
        settings.maxBounces
      );
    }

    for (const obs of elements.filter(e => e.type === 'obstacle')) {
      this.computeShadowSilhouette(light, obs as Obstacle, elements, intensity);
    }
  }

  private traceLightRay(
    origin: Point,
    dir: Vector,
    intensity: number,
    color: { r: number; g: number; b: number },
    elements: AnyElement[],
    maxBounces: number,
    bounces: number = 0
  ) {
    if (bounces > maxBounces || intensity < 0.05) return;
    if (!this.lightBuffer) return;

    let closestHit: any = null;
    for (const el of elements) {
      if (el.type === 'light') continue;
      const hit = intersectElement(origin, dir, el);
      if (hit && hit.t > EPS && (!closestHit || hit.t < closestHit.t)) {
        closestHit = hit;
      }
    }

    const endPoint = closestHit
      ? closestHit.point
      : add(origin, mul(dir, 5000));

    this.accumulateLine(origin, endPoint, intensity / ACCUMULATION_FRAMES, color);

    if (closestHit) {
      const { element, point, normal } = closestHit;

      if (element.type === 'mirror') {
        const mirror = element as any;
        const reflectedDir = this.reflect(dir, normal);
        this.traceLightRay(
          add(point, mul(reflectedDir, EPS * 10)),
          normalize(reflectedDir),
          intensity * mirror.reflectivity * 0.8,
          color,
          elements,
          maxBounces,
          bounces + 1
        );
      } else if (element.type === 'lens') {
        const lens = element as any;
        const n1 = 1.0;
        const n2 = lens.refractiveIndex;
        const refractedDir = this.refract(dir, normal, n1 / n2);
        if (refractedDir) {
          const lensHit = this.findLensExit(add(point, mul(refractedDir, EPS * 10)), refractedDir, lens);
          if (lensHit) {
            this.accumulateLine(point, lensHit.point, intensity * 0.9 / ACCUMULATION_FRAMES, color);
            const exitDir = this.refract(refractedDir, { x: -lensHit.normal.x, y: -lensHit.normal.y }, n2 / n1);
            if (exitDir) {
              this.traceLightRay(
                add(lensHit.point, mul(exitDir, EPS * 10)),
                normalize(exitDir),
                intensity * 0.8,
                color,
                elements,
                maxBounces,
                bounces + 1
              );
            }
          }
        }
      }
    }
  }

  private accumulateLine(start: Point, end: Point, intensity: number, color: { r: number; g: number; b: number }) {
    if (!this.lightBuffer) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = maxDim / SCALE;
    const numSteps = Math.ceil(Math.max(steps, 1));

    const invSteps = 1 / numSteps;
    for (let i = 0; i <= numSteps; i++) {
      const t = i * invSteps;
      const x = Math.floor((start.x + dx * t) / SCALE);
      const y = Math.floor((start.y + dy * t) / SCALE);

      if (x >= 0 && x < this.scaledWidth && y >= 0 && y < this.scaledHeight) {
        const idx = (y * this.scaledWidth + x) * 3;
        const falloff = 1 - t * 0.25;
        const val = intensity * falloff;
        this.lightBuffer[idx] += color.r * val;
        this.lightBuffer[idx + 1] += color.g * val;
        this.lightBuffer[idx + 2] += color.b * val;
      }
    }
  }

  private computeShadowSilhouette(
    light: LightSource,
    obstacle: Obstacle,
    elements: AnyElement[],
    intensity: number
  ) {
    if (!this.lightBuffer) return;

    const corners = this.getObstacleCorners(obstacle);

    for (let ci = 0; ci < corners.length; ci++) {
      const corner = corners[ci];
      const toCorner = sub(corner, light.position);
      const dist = Math.sqrt(toCorner.x * toCorner.x + toCorner.y * toCorner.y);
      if (dist < 1) continue;
      const dir = mul(toCorner, 1 / dist);

      const shadowWidth = 0.06;
      const raysPerEdge = 3;

      for (let o = 0; o < raysPerEdge; o++) {
        const t = (o + 0.5) / raysPerEdge - 0.5;
        const offsetAngle = t * shadowWidth * 2;
        const sampleDir = normalize({
          x: dir.x * Math.cos(offsetAngle) - dir.y * Math.sin(offsetAngle),
          y: dir.x * Math.sin(offsetAngle) + dir.y * Math.cos(offsetAngle),
        });

        let blockDist = Infinity;

        for (const el of elements) {
          if (el.type === 'light') continue;
          const hit = intersectElement(light.position, sampleDir, el);
          if (hit && hit.t > EPS && hit.t < blockDist) {
            blockDist = hit.t;
          }
        }

        if (blockDist < 5000) {
          const shadowStart = add(light.position, mul(sampleDir, blockDist));
          const shadowEnd = add(light.position, mul(sampleDir, 5000));
          this.accumulateShadow(shadowStart, shadowEnd, intensity * 0.5);
        }
      }
    }
  }

  private accumulateShadow(start: Point, end: Point, intensity: number) {
    if (!this.lightBuffer) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = maxDim / (SCALE * 2);
    const numSteps = Math.ceil(Math.max(steps, 1));

    const invSteps = 1 / numSteps;
    const shadowVal = intensity * 0.25 / ACCUMULATION_FRAMES;

    for (let i = 0; i <= numSteps; i++) {
      const t = i * invSteps;
      const x = Math.floor((start.x + dx * t) / SCALE);
      const y = Math.floor((start.y + dy * t) / SCALE);

      if (x >= 0 && x < this.scaledWidth && y >= 0 && y < this.scaledHeight) {
        const idx = (y * this.scaledWidth + x) * 3;
        const shadowFactor = (1 - t * 0.6) * shadowVal;
        this.lightBuffer[idx] -= shadowFactor;
        this.lightBuffer[idx + 1] -= shadowFactor;
        this.lightBuffer[idx + 2] -= shadowFactor;
      }
    }
  }

  private getObstacleCorners(obs: Obstacle): Point[] {
    const { position, rotation, width, height } = obs;
    const hw = width / 2;
    const hh = height / 2;
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ].map(c => add(rotate(c, rotation), position));
  }

  private reflect(d: Vector, n: Vector): Vector {
    const dn = dot(d, n);
    return { x: d.x - 2 * dn * n.x, y: d.y - 2 * dn * n.y };
  }

  private refract(d: Vector, n: Vector, eta: number): Vector | null {
    const cosI = -dot(d, n);
    const sin2T = eta * eta * (1 - cosI * cosI);
    if (sin2T > 1) return null;
    const cosT = Math.sqrt(1 - sin2T);
    return {
      x: eta * d.x + (eta * cosI - cosT) * n.x,
      y: eta * d.y + (eta * cosI - cosT) * n.y,
    };
  }

  private findLensExit(origin: Point, dir: Vector, lens: any): { point: Point; normal: Vector } | null {
    const { position, rotation, width } = lens;
    const half = width / 2;
    const top = add(position, rotate({ x: -half, y: 0 }, rotation));
    const bottom = add(position, rotate({ x: half, y: 0 }, rotation));

    const v1 = sub(origin, top);
    const v2 = sub(bottom, top);
    const v3 = { x: -dir.y, y: dir.x };
    const denom = dot(v2, v3);
    if (Math.abs(denom) < EPS) return null;

    const t = (v2.x * v1.y - v2.y * v1.x) / denom;
    const u = (v1.x * v3.y - v1.y * v3.x) / denom;
    if (t > EPS * 10 && u >= 0 && u <= 1) {
      const point = add(origin, mul(dir, t));
      const tangent = normalize(v2);
      let normal = { x: -tangent.y, y: tangent.x };
      if (dot(normal, dir) > 0) {
        normal = { x: -normal.x, y: -normal.y };
      }
      return { point, normal };
    }
    return null;
  }

  private wavelengthToRGB(wavelength: number): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0;
    if (wavelength >= 380 && wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380); b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
      g = (wavelength - 440) / (490 - 440); b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
      g = 1; b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
      r = (wavelength - 510) / (580 - 510); g = 1;
    } else if (wavelength >= 580 && wavelength < 645) {
      r = 1; g = -(wavelength - 645) / (645 - 580);
    } else if (wavelength >= 645 && wavelength <= 780) {
      r = 1;
    }
    return { r, g, b };
  }

  private renderBufferToCanvas() {
    if (!this.offscreenCtx || !this.lightBuffer || !this.offscreenCanvas) return;

    const imageData = this.offscreenCtx.createImageData(this.scaledWidth, this.scaledHeight);
    const data = imageData.data;

    const blend = this.accumulationCount > 0 ? 1 / this.accumulationCount : 0;

    for (let i = 0; i < this.scaledWidth * this.scaledHeight; i++) {
      const bufIdx = i * 3;
      const pxIdx = i * 4;

      let r = this.lightBuffer[bufIdx];
      let g = this.lightBuffer[bufIdx + 1];
      let b = this.lightBuffer[bufIdx + 2];

      if (r > 0 || g > 0 || b > 0) {
        const positive = Math.max(0, r) * 0.33 + Math.max(0, g) * 0.33 + Math.max(0, b) * 0.34;
        const exposure = 2.0;
        const hdr = 1 - Math.exp(-positive * exposure);
        data[pxIdx] = Math.min(255, Math.max(0, r) * 255 * 0.5);
        data[pxIdx + 1] = Math.min(255, Math.max(0, g) * 255 * 0.5);
        data[pxIdx + 2] = Math.min(255, Math.max(0, b) * 255 * 0.5);
        data[pxIdx + 3] = Math.min(220, hdr * 220);
      } else {
        const shadow = Math.max(0, -r - g - b) / 3;
        if (shadow > 0.015) {
          data[pxIdx] = 5;
          data[pxIdx + 1] = 15;
          data[pxIdx + 2] = 30;
          data[pxIdx + 3] = Math.min(200, shadow * 250);
        } else {
          data[pxIdx + 3] = 0;
        }
      }
    }

    this.offscreenCtx.putImageData(imageData, 0, 0);
  }

  drawTo(ctx: CanvasRenderingContext2D) {
    if (!this.offscreenCanvas || this.width === 0) return;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.85;
    ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
    ctx.restore();
  }

  reset() {
    if (this.lightBuffer) {
      this.lightBuffer.fill(0);
    }
    this.accumulationCount = 0;
    this.frameCount = 0;
  }
}

export const lightingAccumulator = new LightingAccumulator();
