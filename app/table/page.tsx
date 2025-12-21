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
      >
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50" />
      </PanelOverlay>

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
          transition={{ duration: 0.3, ease: 'easeInOut' }}
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
            <UserQualificationPanel onApply={() => collapsePanel('user')} />
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
      className={`fixed ${top} right-4 z-20 transition-all duration-300 shadow-xl flex flex-col items-center py-4 px-3 min-h-[120px] ${
        isActive
          ? 'bg-white/95 backdrop-blur-md border-2 border-white/50 text-gray-800 hover:bg-white shadow-2xl'
          : 'bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20'
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
  const { user, isUsingQualificationFilter } = useUserContext();
  const filteredSchools = useFilteredSchools(schools, filters, user);
  const { setZoomLevel } = useMapZoom();

  // 當組件掛載時，重置縮放級別為初始值（確保切換頁面時恢復預設狀態）
  useEffect(() => {
    setZoomLevel(2);
  }, [setZoomLevel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">載入學校資料中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-screen w-full transition-colors duration-300 ${
      isUsingQualificationFilter 
        ? 'bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950' 
        : 'bg-black'
    }`}>
      <FloatingSearchBar schoolCount={filteredSchools.length} />

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

