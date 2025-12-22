'use client';

import React from 'react';
import { PanelType } from '@/hooks/usePanelManager';
import { motion, AnimatePresence } from 'framer-motion';

interface PanelOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelType: PanelType;
  variant?: 'glass' | 'wishlist';
  zIndex?: number;
  overlayStyle?: 'default' | 'subtle' | 'none';
  contentAnimation?: 'default' | 'none';
  closeOnBackdropClick?: boolean;
}

export default function PanelOverlay({
  isVisible,
  onClose,
  children,
  panelType: _panelType,
  variant = 'glass',
  zIndex = 40,
  overlayStyle = 'default',
  contentAnimation = 'default',
  closeOnBackdropClick = true,
}: PanelOverlayProps) {
  const overlayClass =
    overlayStyle === 'none'
      ? ''
      : overlayStyle === 'subtle'
        ? 'fixed inset-0 bg-black/10 pointer-events-none'
        : variant === 'wishlist'
          ? 'fixed inset-0 bg-[#4a3828]/10 backdrop-blur-md pointer-events-none'
          : 'fixed inset-0 bg-black/40 backdrop-blur-md pointer-events-none';

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <>
          {/* 背景模糊遮罩層 */}
          {overlayStyle !== 'none' && (
            <motion.div
              className={overlayClass}
              style={{ zIndex }}
              initial={{ opacity: 0, backdropFilter: overlayStyle === 'subtle' ? 'blur(0px)' : 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: overlayStyle === 'subtle' ? 'blur(0px)' : 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: overlayStyle === 'subtle' ? 'blur(0px)' : 'blur(0px)' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          )}

          {/* 可點擊的遮罩層 */}
          {closeOnBackdropClick && (
            <motion.div
              className="fixed inset-0 pointer-events-auto"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ zIndex: zIndex + 5, background: 'transparent' }}
            />
          )}

          {/* 面板內容 */}
          <motion.div
            className="relative pointer-events-auto"
            style={{ zIndex: zIndex + 10 }}
            initial={contentAnimation === 'none' ? false : { opacity: 0, scale: 0.95, y: -20 }}
            animate={contentAnimation === 'none' ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={contentAnimation === 'none' ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
