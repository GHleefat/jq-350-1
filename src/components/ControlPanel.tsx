import { Grid, Waves, RefreshCw, Trash2, Sun } from 'lucide-react';
import { useOpticsStore } from '../store/useOpticsStore';

export function ControlPanel() {
  const settings = useOpticsStore(s => s.settings);
  const updateSettings = useOpticsStore(s => s.updateSettings);
  const resetScene = useOpticsStore(s => s.resetScene);
  const clearAll = useOpticsStore(s => s.clearAll);
  const elements = useOpticsStore(s => s.elements);
  const selectedId = useOpticsStore(s => s.selectedId);

  const lightCount = elements.filter(e => e.type === 'light').length;
  const totalRayCount = elements
    .filter(e => e.type === 'light')
    .reduce((sum, e: any) => sum + (e.rayCount || 0), 0);

  const toggle = (key: 'showGrid' | 'showNormals') => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="glass-panel px-5 py-3 flex items-center gap-6">
      <div className="flex items-center gap-4">
        <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            settings.showGrid
              ? 'bg-lab-cyan/20 border-lab-cyan text-lab-cyan'
              : 'bg-lab-panel border-lab-border text-lab-cyan/60 hover:border-lab-cyan/50'
          }`}
          onClick={() => toggle('showGrid')}
        >
          <Grid size={14} />
          网格
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            settings.showNormals
              ? 'bg-lab-green/20 border-lab-green text-lab-green'
              : 'bg-lab-panel border-lab-border text-lab-cyan/60 hover:border-lab-green/50'
          }`}
          onClick={() => toggle('showNormals')}
        >
          <Waves size={14} />
          法线
        </button>
      </div>

      <div className="h-6 w-px bg-lab-border" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-lab-amber" />
          <span className="text-xs font-mono text-lab-cyan/70">最大反射</span>
          <input
            type="range"
            className="slider-track w-24"
            min={0}
            max={10}
            step={1}
            value={settings.maxBounces}
            onChange={(e) => updateSettings({ maxBounces: parseInt(e.target.value) })}
          />
          <span className="text-xs font-mono text-lab-cyan w-4">{settings.maxBounces}</span>
        </div>
      </div>

      <div className="h-6 w-px bg-lab-border" />

      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-lab-cyan/50">元件</span>
          <span className="text-lab-cyan">{elements.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lab-cyan/50">光源</span>
          <span className="text-lab-amber">{lightCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-lab-cyan/50">光线</span>
          <span className="text-lab-green">{totalRayCount}</span>
        </div>
        {selectedId && (
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded bg-lab-cyan/10 border border-lab-cyan/30">
            <span className="text-lab-cyan">已选中</span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-lab-panel border border-lab-border text-lab-cyan/70 hover:border-lab-cyan hover:text-lab-cyan transition-all"
          onClick={resetScene}
        >
          <RefreshCw size={14} />
          重置
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-red-950/40 border border-red-500/30 text-red-400 hover:border-red-500 hover:text-red-300 transition-all"
          onClick={clearAll}
        >
          <Trash2 size={14} />
          清空
        </button>
      </div>
    </div>
  );
}
