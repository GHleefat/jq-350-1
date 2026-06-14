import { Trash2 } from 'lucide-react';
import { useOpticsStore } from '../store/useOpticsStore';
import type { AnyElement, LightSource, Mirror, Lens, Obstacle } from '../types';

function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-lab-cyan/70">{label}</span>
        <span className="text-xs font-mono text-lab-cyan">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input
        type="range"
        className="slider-track"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function LightPanel({ element }: { element: LightSource }) {
  const updateElement = useOpticsStore(s => s.updateElement);

  return (
    <div className="space-y-4">
      <SliderControl
        label="光线数量"
        value={element.rayCount}
        min={10}
        max={200}
        step={5}
        onChange={(v) => updateElement(element.id, { rayCount: Math.round(v) })}
      />
      <SliderControl
        label="发射角度"
        value={(element.spreadAngle * 180) / Math.PI}
        min={5}
        max={360}
        step={5}
        unit="°"
        onChange={(v) => updateElement(element.id, { spreadAngle: (v * Math.PI) / 180 })}
      />
      <SliderControl
        label="旋转角度"
        value={(element.rotation * 180) / Math.PI}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => updateElement(element.id, { rotation: (v * Math.PI) / 180 })}
      />
      <SliderControl
        label="光强度"
        value={element.intensity}
        min={0.1}
        max={2}
        step={0.05}
        onChange={(v) => updateElement(element.id, { intensity: v })}
      />
      <SliderControl
        label="波长(颜色)"
        value={element.wavelength}
        min={380}
        max={780}
        step={5}
        unit="nm"
        onChange={(v) => updateElement(element.id, { wavelength: Math.round(v) })}
      />
    </div>
  );
}

function MirrorPanel({ element }: { element: Mirror }) {
  const updateElement = useOpticsStore(s => s.updateElement);

  return (
    <div className="space-y-4">
      <SliderControl
        label="宽度"
        value={element.width}
        min={40}
        max={500}
        step={5}
        unit="px"
        onChange={(v) => updateElement(element.id, { width: v })}
      />
      <SliderControl
        label="旋转角度"
        value={(element.rotation * 180) / Math.PI}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => updateElement(element.id, { rotation: (v * Math.PI) / 180 })}
      />
      <SliderControl
        label="反射率"
        value={element.reflectivity}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(v) => updateElement(element.id, { reflectivity: v })}
      />
    </div>
  );
}

function LensPanel({ element }: { element: Lens }) {
  const updateElement = useOpticsStore(s => s.updateElement);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <span className="text-xs font-mono text-lab-cyan/70">透镜类型</span>
        <div className="flex gap-2">
          <button
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              element.isConvex
                ? 'bg-lab-cyan/20 border-lab-cyan text-lab-cyan shadow-glow-cyan'
                : 'bg-lab-panel border-lab-border text-lab-cyan/70 hover:border-lab-cyan'
            }`}
            onClick={() => updateElement(element.id, { isConvex: true })}
          >
            凸透镜
          </button>
          <button
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all border ${
              !element.isConvex
                ? 'bg-lab-pink/20 border-lab-pink text-lab-pink shadow-glow-cyan'
                : 'bg-lab-panel border-lab-border text-lab-cyan/70 hover:border-lab-pink'
            }`}
            onClick={() => updateElement(element.id, { isConvex: false })}
          >
            凹透镜
          </button>
        </div>
      </div>
      <SliderControl
        label="直径"
        value={element.width}
        min={40}
        max={400}
        step={5}
        unit="px"
        onChange={(v) => updateElement(element.id, { width: v })}
      />
      <SliderControl
        label="旋转角度"
        value={(element.rotation * 180) / Math.PI}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => updateElement(element.id, { rotation: (v * Math.PI) / 180 })}
      />
      <SliderControl
        label="折射率"
        value={element.refractiveIndex}
        min={1.1}
        max={2.5}
        step={0.05}
        onChange={(v) => updateElement(element.id, { refractiveIndex: v })}
      />
    </div>
  );
}

function ObstaclePanel({ element }: { element: Obstacle }) {
  const updateElement = useOpticsStore(s => s.updateElement);

  return (
    <div className="space-y-4">
      <SliderControl
        label="宽度"
        value={element.width}
        min={20}
        max={400}
        step={5}
        unit="px"
        onChange={(v) => updateElement(element.id, { width: v })}
      />
      <SliderControl
        label="高度"
        value={element.height}
        min={20}
        max={400}
        step={5}
        unit="px"
        onChange={(v) => updateElement(element.id, { height: v })}
      />
      <SliderControl
        label="旋转角度"
        value={(element.rotation * 180) / Math.PI}
        min={-180}
        max={180}
        step={1}
        unit="°"
        onChange={(v) => updateElement(element.id, { rotation: (v * Math.PI) / 180 })}
      />
    </div>
  );
}

const typeLabels: Record<string, { name: string; icon: string; color: string }> = {
  light: { name: '光源', icon: '💡', color: 'text-lab-amber' },
  mirror: { name: '镜面', icon: '🪞', color: 'text-blue-300' },
  lens: { name: '透镜', icon: '🔍', color: 'text-lab-cyan' },
  obstacle: { name: '障碍物', icon: '🧱', color: 'text-red-400' },
};

export function PropertiesPanel() {
  const selectedId = useOpticsStore(s => s.selectedId);
  const elements = useOpticsStore(s => s.elements);
  const deleteElement = useOpticsStore(s => s.deleteElement);
  const updateElement = useOpticsStore(s => s.updateElement);

  const selected = elements.find(e => e.id === selectedId) as AnyElement | undefined;

  if (!selected) {
    return (
      <div className="glass-panel p-5 w-72">
        <h3 className="font-mono text-sm text-lab-cyan/80 mb-3 flex items-center gap-2">
          <span>⚙️</span> 属性面板
        </h3>
        <div className="text-xs text-lab-cyan/40 font-mono space-y-2 py-4">
          <p>未选中任何元件</p>
          <p className="text-lab-cyan/30">
            点击画布上的元件进行编辑，<br />
            或从左侧工具栏添加新元件
          </p>
        </div>
      </div>
    );
  }

  const info = typeLabels[selected.type];

  const renderContent = () => {
    switch (selected.type) {
      case 'light': return <LightPanel element={selected as LightSource} />;
      case 'mirror': return <MirrorPanel element={selected as Mirror} />;
      case 'lens': return <LensPanel element={selected as Lens} />;
      case 'obstacle': return <ObstaclePanel element={selected as Obstacle} />;
    }
  };

  return (
    <div className="glass-panel p-5 w-72 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-lab-border">
        <h3 className="font-mono text-sm flex items-center gap-2">
          <span>{info.icon}</span>
          <span className={info.color}>{info.name}</span>
        </h3>
        <div className="flex gap-1">
          <button
            className="p-1.5 rounded-lg hover:bg-lab-cyan/10 text-lab-cyan/60 hover:text-lab-cyan transition-colors"
            title="删除"
            onClick={() => deleteElement(selected.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mb-4 space-y-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-lab-cyan/50">X 坐标</span>
          <span className="text-lab-cyan">{Math.round(selected.position.x)}</span>
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-lab-cyan/50">Y 坐标</span>
          <span className="text-lab-cyan">{Math.round(selected.position.y)}</span>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
