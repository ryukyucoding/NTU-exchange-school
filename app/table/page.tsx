'use client';

import { useSchoolContext } from '@/contexts/SchoolContext';
import { useFilters } from '@/contexts/FilterContext';
import { useUserContext } from '@/contexts/UserContext';
import { useFilteredSchools } from '@/hooks/useFilteredSchools';
import { usePanelManager } from '@/hooks/usePanelManager';
import { useMapZoom } from '@/contexts/MapZoomContext';
import FloatingSearchBar from '@/components/layout/FloatingSearchBar';
import UserQualificationPanel from '@/components/filters/UserQualificationPanel';
import TableView from '@/components/views/TableView';
import LoadingScreen from '@/components/ui/loading-screen';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

function UnifiedPanelManager() {
  const panelManager = usePanelManager();
  const { panels, expandPanel, collapsePanel, isAnyPanelOpen } = panelManager;
  const { isUsingQualificationFilter } = useUserContext();

  return (
    <>
      <PanelOverlay
        isVisible={panels.search.isExpanded}
        onClose={() => collapsePanel('search')}
        panelType="search"
        variant="wishlist"
      >
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50" />
      </PanelOverlay>

      <PanelOverlay
        isVisible={panels.user.isExpanded}
        onClose={() => collapsePanel('user')}
        panelType="user"
        variant="wishlist"
        contentAnimation="none"
      >
        <motion.div
          className="fixed top-20 right-4 z-20 w-80"
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="bg-white border border-[#d6c3a1] rounded-xl shadow-sm p-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-[#4a3828] font-semibold">我的資格</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => collapsePanel('user')}
                className="text-[#6b5b4c] hover:text-[#4a3828] hover:bg-[#f5ede1]"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <UserQualificationPanel onApply={() => collapsePanel('user')} variant="wishlist" />
          </div>
        </motion.div>
      </PanelOverlay>

      <AnimatePresence>
        {!isAnyPanelOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CollapseButton
              top="top-20"
              text="我<br />的<br />資<br />格"
              onClick={() => expandPanel('user')}
              isActive={isUsingQualificationFilter}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function CollapseButton({
  top,
  text,
  onClick,
  isActive = false,
}: {
  top: string;
  text: string;
  onClick: () => void;
  isActive?: boolean;
}) {
  return (
    <Button
      variant='outline'
      size='sm'
      className={`fixed ${top} right-4 z-20 transition-all duration-300 shadow-sm flex flex-col items-center py-4 px-3 min-h-[120px] ${
        isActive
          ? 'bg-[#f5ede1] border-2 border-[#d6c3a1] text-[#4a3828] hover:bg-[#e8ddc8] hover:text-[#4a3828]'
          : 'bg-white border border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
      }`}
      onClick={onClick}
    >
      <ChevronLeft className='w-4 h-4 mb-2' />
      <span className='text-xs leading-tight' dangerouslySetInnerHTML={{ __html: text }} />
    </Button>
  );
}

function TableContent() {
  const { schools, loading } = useSchoolContext();
  const { filters } = useFilters();
  const { user } = useUserContext();
  const filteredSchools = useFilteredSchools(schools, filters, user);
  const { setZoomLevel } = useMapZoom();

  // 當組件掛載時，重置縮放級別為初始值（確保切換頁面時恢復預設狀態）
  useEffect(() => {
    setZoomLevel(2);
  }, [setZoomLevel]);

  if (loading) {
    return <LoadingScreen text="載入學校資料中..." />;
  }

  return (
    <div
      className="relative h-screen w-full transition-colors duration-300"
      style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}
    >
      <FloatingSearchBar schoolCount={filteredSchools.length} variant="wishlist" />

      <UnifiedPanelManager />

      <div className="px-4 pb-6 pointer-events-auto relative z-10 h-full overflow-y-auto pt-24">
        <div className="container mx-auto">
          <div className="mt-8">
            <TableView schools={filteredSchools} />
          </div>
        </div>
      </div>
    </div>
  );
}

import RouteGuard from '@/components/auth/RouteGuard';

export default function TablePage() {
  return (
    <RouteGuard>
      <TableContent />
    </RouteGuard>
  );
}

