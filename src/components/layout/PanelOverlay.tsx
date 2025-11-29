import React from 'react';
import { PanelType } from '@/hooks/usePanelManager';
import { motion, AnimatePresence } from 'framer-motion';

interface PanelOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelType: PanelType;
}

export default function PanelOverlay({
  isVisible,
  onClose,
  children,
  panelType: _panelType,
}: PanelOverlayProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <>
          {/* 背景模糊遮罩層 */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 pointer-events-none"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />

          {/* 可點擊的遮罩層 */}
          <motion.div
            className="fixed inset-0 z-[45] pointer-events-auto"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{
              background: 'transparent'
            }}
          />

          {/* 面板內容 */}
          <motion.div
            className="relative z-50 pointer-events-auto"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
