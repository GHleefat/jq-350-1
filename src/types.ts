export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Ray {
  origin: Point;
  direction: Vector;
  intensity: number;
  bounces: number;
  wavelength: number;
}

export interface RaySegment {
  start: Point;
  end: Point;
  intensity: number;
  wavelength: number;
}

export type ElementType = 'light' | 'mirror' | 'lens' | 'obstacle';

export type ToolType = ElementType | 'select' | null;

export interface OpticalElement {
  id: string;
  type: ElementType;
  position: Point;
  rotation: number;
  selected?: boolean;
}

export interface LightSource extends OpticalElement {
  type: 'light';
  rayCount: number;
  spreadAngle: number;
  color: string;
  intensity: number;
  wavelength: number;
}

export interface Mirror extends OpticalElement {
  type: 'mirror';
  width: number;
  reflectivity: number;
}

export interface Lens extends OpticalElement {
  type: 'lens';
  width: number;
  thickness: number;
  refractiveIndex: number;
  isConvex: boolean;
}

export interface Obstacle extends OpticalElement {
  type: 'obstacle';
  width: number;
  height: number;
}

export type AnyElement = LightSource | Mirror | Lens | Obstacle;

export interface GlobalSettings {
  maxBounces: number;
  showGrid: boolean;
  showNormals: boolean;
  ambientLight: number;
}

export interface HitResult {
  point: Point;
  normal: Vector;
  distance: number;
  element: AnyElement;
  t: number;
}
