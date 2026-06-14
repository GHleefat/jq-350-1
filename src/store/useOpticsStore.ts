import { create } from 'zustand';
import type {
  AnyElement,
  LightSource,
  Mirror,
  Lens,
  Obstacle,
  ToolType,
  GlobalSettings,
  Point,
  ElementType,
} from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createDefaultElements(): AnyElement[] {
  return [
    {
      id: generateId(),
      type: 'light',
      position: { x: 150, y: 400 },
      rotation: 0,
      rayCount: 60,
      spreadAngle: Math.PI / 3,
      color: '#ffaa00',
      intensity: 1.0,
      wavelength: 580,
      selected: false,
    } as LightSource,
    {
      id: generateId(),
      type: 'mirror',
      position: { x: 500, y: 300 },
      rotation: Math.PI / 4,
      width: 180,
      reflectivity: 0.9,
      selected: false,
    } as Mirror,
    {
      id: generateId(),
      type: 'obstacle',
      position: { x: 700, y: 450 },
      rotation: 0,
      width: 80,
      height: 120,
      selected: false,
    } as Obstacle,
  ];
}

interface OpticsState {
  elements: AnyElement[];
  selectedId: string | null;
  activeTool: ToolType;
  settings: GlobalSettings;
  canvasSize: { width: number; height: number };

  setActiveTool: (tool: ToolType) => void;
  setSelectedId: (id: string | null) => void;
  setCanvasSize: (width: number, height: number) => void;

  addElement: (type: ElementType, position: Point) => void;
  updateElement: (id: string, updates: Partial<AnyElement>) => void;
  deleteElement: (id: string) => void;
  deleteSelected: () => void;
  clearAll: () => void;
  resetScene: () => void;

  updateSettings: (updates: Partial<GlobalSettings>) => void;
}

export const useOpticsStore = create<OpticsState>((set, get) => ({
  elements: createDefaultElements(),
  selectedId: null,
  activeTool: 'select',
  settings: {
    maxBounces: 5,
    showGrid: true,
    showNormals: false,
    ambientLight: 0.05,
  },
  canvasSize: { width: 800, height: 600 },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedId: (id) => {
    const elements = get().elements.map(e => ({
      ...e,
      selected: e.id === id,
    }));
    set({ selectedId: id, elements });
  },
  setCanvasSize: (width, height) => set({ canvasSize: { width, height } }),

  addElement: (type, position) => {
    let newElement: AnyElement;
    const id = generateId();

    switch (type) {
      case 'light':
        newElement = {
          id,
          type: 'light',
          position,
          rotation: 0,
          rayCount: 60,
          spreadAngle: Math.PI / 3,
          color: '#ffaa00',
          intensity: 1.0,
          wavelength: 580,
          selected: true,
        } as LightSource;
        break;
      case 'mirror':
        newElement = {
          id,
          type: 'mirror',
          position,
          rotation: 0,
          width: 150,
          reflectivity: 0.9,
          selected: true,
        } as Mirror;
        break;
      case 'lens':
        newElement = {
          id,
          type: 'lens',
          position,
          rotation: Math.PI / 2,
          width: 160,
          thickness: 20,
          refractiveIndex: 1.5,
          isConvex: true,
          selected: true,
        } as Lens;
        break;
      case 'obstacle':
        newElement = {
          id,
          type: 'obstacle',
          position,
          rotation: 0,
          width: 80,
          height: 100,
          selected: true,
        } as Obstacle;
        break;
      default:
        return;
    }

    const elements: AnyElement[] = get().elements.map(e => ({ ...e, selected: false } as AnyElement));
    elements.push(newElement);
    set({ elements, selectedId: id, activeTool: 'select' });
  },

  updateElement: (id, updates) => {
    const elements = get().elements.map(e =>
      e.id === id ? ({ ...e, ...updates } as AnyElement) : e
    );
    set({ elements });
  },

  deleteElement: (id) => {
    const elements = get().elements.filter(e => e.id !== id);
    const selectedId = get().selectedId === id ? null : get().selectedId;
    set({ elements, selectedId });
  },

  deleteSelected: () => {
    const { selectedId } = get();
    if (selectedId) {
      get().deleteElement(selectedId);
    }
  },

  clearAll: () => set({ elements: [], selectedId: null }),
  resetScene: () => set({ elements: createDefaultElements(), selectedId: null }),

  updateSettings: (updates) => {
    set({ settings: { ...get().settings, ...updates } });
  },
}));
