import { Toolbar } from '../components/Toolbar';
import { OpticsCanvas } from '../components/OpticsCanvas';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { ControlPanel } from '../components/ControlPanel';

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col bg-lab-bg">
      <div className="flex-1 flex p-4 gap-4 min-h-0">
        <div className="flex flex-col gap-4">
          <Toolbar />
          <div className="flex-1" />
          <div className="glass-panel p-3 w-[72px]">
            <div className="text-[10px] font-mono text-lab-cyan/50 leading-relaxed space-y-1">
              <p className="text-lab-cyan/80">快捷键</p>
              <p>V 选择</p>
              <p>L 光源</p>
              <p>M 镜面</p>
              <p>N 透镜</p>
              <p>B 障碍</p>
              <p>Del 删除</p>
              <p>Esc 取消</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 glass-panel overflow-hidden min-h-0">
            <OpticsCanvas />
          </div>
          <ControlPanel />
        </div>

        <PropertiesPanel />
      </div>
    </div>
  );
}
