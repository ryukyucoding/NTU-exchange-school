import { Table, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Link from 'next/link';

export type ViewMode = 'table' | 'map';

interface ViewModeSwitcherProps {
  currentMode: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
  modeLinks?: {
    map?: string;
    table?: string;
  };
}

export default function ViewModeSwitcher({ currentMode, onModeChange, modeLinks }: ViewModeSwitcherProps) {
  const renderButton = (
    mode: ViewMode,
    label: string,
    Icon: typeof Map
  ) => {
    const content = (
      <Button
        variant="ghost"
        size="sm"
        className={`transition-all duration-300 ${
          currentMode === mode
            ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg backdrop-blur-sm'
            : 'text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20'
        }`}
        onClick={() => onModeChange && onModeChange(mode)}
      >
        <Icon className="w-4 h-4 mr-2" />
        {label}
      </Button>
    );

    const link = mode === 'map' ? modeLinks?.map : modeLinks?.table;

    return link ? (
      <Link href={link} prefetch>
        {content}
      </Link>
    ) : (
      content
    );
  };

  return (
    <div className="flex gap-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-1 shadow-xl">
      {renderButton('map', '地圖模式', Map)}
      {renderButton('table', '表格模式', Table)}
    </div>
  );
}
