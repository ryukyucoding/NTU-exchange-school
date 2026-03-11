'use client';

import { useEffect } from 'react';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { useFilters } from '@/contexts/FilterContext';
import { useUserContext } from '@/contexts/UserContext';
import { useFilteredSchools } from '@/hooks/useFilteredSchools';
import { usePanelManager } from '@/hooks/usePanelManager';
import { useMapBackgroundBrightness } from '@/hooks/useBackgroundBrightness';
import FloatingSearchBar from '@/components/layout/FloatingSearchBar';
import UserQualificationPanel from '@/components/filters/UserQualificationPanel';
import MapView from '@/components/views/MapView';
import FeatureTour from '@/components/onboarding/FeatureTour';
import LoadingScreen from '@/components/ui/loading-screen';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 統一面板管理組件
function UnifiedPanelManager() {
  const panelManager = usePanelManager();
  const { panels, expandPanel, collapsePanel, isAnyPanelOpen } = panelManager;
  const { isUsingQualificationFilter } = useUserContext();
  const isHighZoom = useMapBackgroundBrightness(3);

  // 监听打开资格面板的事件（用于导览）
  useEffect(() => {
    const handleOpenQualificationPanel = () => {
      expandPanel('user');
    };
    window.addEventListener('openQualificationPanel', handleOpenQualificationPanel);
    return () => {
      window.removeEventListener('openQualificationPanel', handleOpenQualificationPanel);
    };
  }, [expandPanel]);

  return (
    <>
      {/* 搜尋面板 */}
      <PanelOverlay
        isVisible={panels.search.isExpanded}
        onClose={() => collapsePanel('search')}
        panelType="search"
        variant="glass"
      >
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          {/* 搜尋欄內容將由 FloatingSearchBar 處理 */}
        </div>
      </PanelOverlay>

      {/* 我的資格面板 */}
      <PanelOverlay
        isVisible={panels.user.isExpanded}
        onClose={() => collapsePanel('user')}
        panelType="user"
        variant="glass"
      >
        <motion.div
          className="fixed top-20 right-4 z-20 w-80"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div
            className={`backdrop-blur-md rounded-lg shadow-2xl p-4 transition-all duration-300 ${
              isHighZoom ? 'bg-white/30' : 'bg-white/20'
            }`}
            style={{
              border: isHighZoom
                ? '1px solid rgba(255, 255, 255, 0.35)'
                : '1px solid rgba(255, 255, 255, 0.30)',
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-semibold transition-all duration-300 ${
                isHighZoom ? 'text-gray-800' : 'text-white'
              }`}>我的資格</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => collapsePanel('user')}
                className={`transition-all duration-300 ${
                  isHighZoom
                    ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    : 'text-white/70 hover:text-white hover:bg-white/20'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <UserQualificationPanel onApply={() => collapsePanel('user')} variant="glass" isHighZoom={isHighZoom} />
          </div>
        </motion.div>
      </PanelOverlay>

      {/* 收合按鈕 */}
      <AnimatePresence>
        {!isAnyPanelOpen && (
          <>
            {/* 我的資格收合按鈕 */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CollapseButton
                top="top-20"
                text="我<br />的<br />資<br />格"
                onClick={() => expandPanel('user')}
                isActive={isUsingQualificationFilter}
                isHighZoom={isHighZoom}
                data-tour-step="qualification"
              />
            </motion.div>

            {/* 預留位置：未來可加入更多收合按鈕 */}
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// 收合按鈕組件
function CollapseButton({
  top,
  text,
  onClick,
  isActive = false,
  isHighZoom = false,
  ...props
}: {
  top: string;
  text: string;
  onClick: () => void;
  isActive?: boolean;
  isHighZoom?: boolean;
  [key: string]: unknown;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`fixed ${top} right-4 z-20 transition-all duration-300 shadow-xl flex flex-col items-center py-4 px-3 min-h-[120px] ${
        isActive
          ? 'bg-white/50 backdrop-blur-md border-2 border-white/60 text-gray-800 hover:bg-white/60 hover:text-gray-900 shadow-2xl'
          : isHighZoom
            ? 'bg-white/30 backdrop-blur-md border border-white/40 text-gray-800 hover:bg-white/40 hover:text-gray-900'
            : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:text-white'
      }`}
      onClick={onClick}
      {...props}
    >
      <ChevronLeft className="w-4 h-4 mb-2" />
      <span className="text-xs leading-tight" dangerouslySetInnerHTML={{ __html: text }} />
    </Button>
  );
}

function MainContent() {
  const { schools, loading } = useSchoolContext();
  const { filters } = useFilters();
  const { user } = useUserContext();
  const filteredSchools = useFilteredSchools(schools, filters, user);

  if (loading) {
    return <LoadingScreen text="載入學校資料中..." />;
  }

  return (
    <div
      className="relative h-screen w-full transition-colors duration-300"
      style={{ marginTop: 0, paddingTop: 0, backgroundColor: 'rgba(244, 244, 244, 1)' }}
    >
      <FloatingSearchBar schoolCount={filteredSchools.length} variant="glass" />

      <UnifiedPanelManager />

      <div data-tour-step="map">
        <MapView schools={filteredSchools} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      <MainContent />
      <FeatureTour tourType="home" />
    </div>
  );
}
