import { useState } from 'react';
import { SchoolProvider, useSchoolContext } from '@/contexts/SchoolContext';
import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { UserProvider, useUserContext } from '@/contexts/UserContext';
import { useFilteredSchools } from '@/hooks/useFilteredSchools';
import { usePanelManager } from '@/hooks/usePanelManager';
import { Toaster } from 'react-hot-toast';
import FloatingSearchBar from '@/components/layout/FloatingSearchBar';
import { ViewMode } from '@/components/layout/ViewModeSwitcher';
import UserQualificationPanel from '@/components/filters/UserQualificationPanel';
import TableView from '@/components/views/TableView';
import MapView from '@/components/views/MapView';
import WishlistPanel from '@/components/wishlist/WishlistPanel';
import WelcomeDialog from '@/components/onboarding/WelcomeDialog';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// 統一面板管理組件
function UnifiedPanelManager() {
  const panelManager = usePanelManager();
  const { panels, expandPanel, collapsePanel, isAnyPanelOpen } = panelManager;

  return (
    <>
      {/* 搜尋面板 */}
      <PanelOverlay
        isVisible={panels.search.isExpanded}
        onClose={() => collapsePanel('search')}
        panelType="search"
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
      >
        <motion.div 
          className="fixed top-20 right-4 z-20 w-80"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">我的資格</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => collapsePanel('user')}
                className="text-white/70 hover:text-white hover:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <UserQualificationPanel />
          </div>
        </motion.div>
      </PanelOverlay>

      {/* 收藏面板 */}
      <PanelOverlay
        isVisible={panels.wishlist.isExpanded}
        onClose={() => collapsePanel('wishlist')}
        panelType="wishlist"
      >
        <motion.div 
          className="fixed top-40 right-4 z-20 w-80"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-2xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">收藏學校</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => collapsePanel('wishlist')}
                className="text-white/70 hover:text-white hover:bg-white/20"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <WishlistPanel />
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
              />
            </motion.div>

            {/* 收藏收合按鈕 */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
            >
              <CollapseButton 
                top="top-56"
                text="收<br />藏<br />學<br />校" 
                onClick={() => expandPanel('wishlist')} 
              />
            </motion.div>
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
  onClick 
}: { 
  top: string; 
  text: string; 
  onClick: () => void; 
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`fixed ${top} right-4 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-xl flex flex-col items-center py-4 px-3 min-h-[120px]`}
      onClick={onClick}
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

  const [viewMode, setViewMode] = useState<ViewMode>('map');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入學校資料中...</p>
        </div>
      </div>
    );
  }

  // 地圖模式使用滿版佈局
  if (viewMode === 'map') {
    return (
      <div className="relative h-screen w-full">
        <FloatingSearchBar 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
          schoolCount={filteredSchools.length} 
        />

        <UnifiedPanelManager />

        <MapView schools={filteredSchools} />
      </div>
    );
  }

  // 其他模式使用與地圖模式一致的佈局
  return (
    <div className="relative min-h-screen bg-black">
      <FloatingSearchBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        schoolCount={filteredSchools.length}
      />

      <UnifiedPanelManager />

      {/* 主要內容區域 */}
      <div className="pt-32 px-4 pb-6 pointer-events-auto relative z-10">
        <div className="container mx-auto">
          <div className="mt-8">
            {viewMode === 'table' && <TableView schools={filteredSchools} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <SchoolProvider>
        <FilterProvider>
          <WishlistProvider>
            <div className="min-h-screen bg-gray-50">
              <MainContent />
              <WelcomeDialog />
              <Toaster position="top-right" />
            </div>
          </WishlistProvider>
        </FilterProvider>
      </SchoolProvider>
    </UserProvider>
  );
}

export default App;
