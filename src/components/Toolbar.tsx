import { MousePointer, Lightbulb, Square, Circle, RectangleVertical } from 'lucide-react';
import { useOpticsStore } from '../store/useOpticsStore';
import type { ToolType } from '../types';

interface ToolItem {
  id: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}

const tools: ToolItem[] = [
  { id: 'select', icon: <MousePointer size={20} />, label: '选择工具', shortcut: 'V' },
  { id: 'light', icon: <Lightbulb size={20} />, label: '光源', shortcut: 'L' },
  { id: 'mirror', icon: <RectangleVertical size={20} />, label: '镜面', shortcut: 'M' },
  { id: 'lens', icon: <Circle size={20} />, label: '透镜', shortcut: 'N' },
  { id: 'obstacle', icon: <Square size={20} />, label: '障碍物', shortcut: 'B' },
];

export function Toolbar() {
  const activeTool = useOpticsStore(s => s.activeTool);
  const setActiveTool = useOpticsStore(s => s.setActiveTool);

  return (
    <div className="glass-panel p-3 flex flex-col gap-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`tool-btn group relative ${activeTool === tool.id ? 'active' : ''}`}
          onClick={() => setActiveTool(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
          <span className="absolute left-14 px-2 py-1 rounded-lg bg-lab-panel border border-lab-border text-xs font-mono text-lab-cyan whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {tool.label} <span className="text-lab-cyan/50 ml-1">{tool.shortcut}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
