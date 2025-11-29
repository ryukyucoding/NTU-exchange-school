import { Table, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ViewMode = 'table' | 'map';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

export default function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex gap-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-1 shadow-xl">
      <Button
        variant="ghost"
        size="sm"
        className={`transition-all duration-300 ${
          currentMode === 'map' 
            ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg backdrop-blur-sm' 
            : 'text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20'
        }`}
        onClick={() => onModeChange('map')}
      >
        <Map className="w-4 h-4 mr-2" />
        地圖模式
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`transition-all duration-300 ${
          currentMode === 'table' 
            ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg backdrop-blur-sm' 
            : 'text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20'
        }`}
        onClick={() => onModeChange('table')}
      >
        <Table className="w-4 h-4 mr-2" />
        表格模式
      </Button>
    </div>
  );
}
