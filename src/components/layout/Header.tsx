import { GraduationCap, Github, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="bg-transparent backdrop-blur-md border-b border-white/20 sticky top-0 z-50 shadow-2xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white drop-shadow-lg">
                NTU 交換學校篩選系統
              </h1>
              <p className="text-xs text-white/70 drop-shadow-md">
                Exchange School Filter
              </p>
            </div>
          </div>

          {/* 右側連結 */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20 transition-all duration-300"
              onClick={() => window.open('https://oia.ntu.edu.tw/outgoing/school.list', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              OIA 官網
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20 transition-all duration-300"
              onClick={() => window.open('https://github.com', '_blank')}
            >
              <Github className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
