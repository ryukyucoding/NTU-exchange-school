'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TourStep {
  id: string;
  targetSelector?: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // 可选的操作（如打开面板等）
}

// 首页导览步骤（不需要登录）
const homeTourSteps: TourStep[] = [
  {
    id: 'intro',
    title: '歡迎來到湯圓！',
    description: '這個系統可以幫助你篩選符合條件的交換學校，管理收藏清單，並與其他同學分享交換心得。讓我們開始導覽吧！',
    position: 'center',
  },
  {
    id: 'map',
    targetSelector: '[data-tour-step="map"]',
    title: '導覽地球',
    description: '你可以在地圖上轉動、縮放，點選學校標記來查看詳細資料。地圖會顯示所有符合篩選條件的學校位置。',
    position: 'bottom',
  },
  {
    id: 'search',
    targetSelector: '[data-tour-step="search"]',
    title: '依照需求篩選',
    description: '使用搜尋欄可以快速找到特定學校，也可以點擊篩選按鈕來設定地區、GPA、語言能力等條件。',
    position: 'bottom',
  },
  {
    id: 'qualification',
    targetSelector: '[data-tour-step="qualification"]',
    title: '資格篩選',
    description: '點擊「我的資格」按鈕，輸入你的 GPA、語言成績、學院等資訊，系統會自動篩選出符合條件的學校。',
    position: 'left',
    action: () => {
      // 触发打开资格面板的事件
      const event = new CustomEvent('openQualificationPanel');
      window.dispatchEvent(event);
    },
  },
];

// 收藏页面导览步骤（需要登录）
const wishlistTourSteps: TourStep[] = [
  {
    id: 'wishlist-intro',
    title: '收藏學校與志願序',
    description: '在這裡你可以管理收藏的學校，排序志願順序，並加上個人備註。系統會根據你的志願順序產生申請準備計畫。',
    position: 'center',
  },
  {
    id: 'wishlist-features',
    targetSelector: '[data-tour-step="wishlist-features"]',
    title: '管理收藏清單',
    description: '你可以拖曳學校卡片來調整志願順序，點擊編輯按鈕來加上備註，或移除不需要的學校。',
    position: 'top',
  },
];

// 社群页面导览步骤（需要登录）
const socialTourSteps: TourStep[] = [
  {
    id: 'social-intro',
    title: '進入社群',
    description: '在社群中可以瀏覽不同學校和國家的討論版面，分享交換心得，並與其他同學交流經驗。',
    position: 'center',
  },
  {
    id: 'social-boards',
    targetSelector: '[data-tour-step="social-boards"]',
    title: '瀏覽版面',
    description: '點擊「所有看板」可以查看所有學校和國家的討論版面。你可以追蹤感興趣的版面，隨時關注最新討論。',
    position: 'right',
  },
  {
    id: 'social-post',
    targetSelector: '[data-tour-step="social-post"]',
    title: '發布貼文',
    description: '點擊「發布貼文」按鈕可以分享你的交換心得、學校評價，或提出問題與其他同學交流。',
    position: 'right',
  },
];

// 使用普通数字，因为已经有圆底背景

interface FeatureTourProps {
  tourType?: 'home' | 'wishlist' | 'social'; // 可选，如果不提供则根据路径自动判断
}

export default function FeatureTour({ tourType }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // 根据路径和登录状态确定导览类型和步骤
  const getTourConfig = useCallback(() => {
    // 如果明确指定了 tourType，使用它
    if (tourType) {
      switch (tourType) {
        case 'home':
          return { steps: homeTourSteps, storageKey: 'hasCompletedHomeTour' };
        case 'wishlist':
          return { steps: wishlistTourSteps, storageKey: 'hasCompletedWishlistTour' };
        case 'social':
          return { steps: socialTourSteps, storageKey: 'hasCompletedSocialTour' };
      }
    }

    // 否则根据路径自动判断
    if (pathname === '/wishlist' || pathname?.startsWith('/wishlist')) {
      return { steps: wishlistTourSteps, storageKey: 'hasCompletedWishlistTour' };
    }
    if (pathname === '/social' || pathname?.startsWith('/social')) {
      return { steps: socialTourSteps, storageKey: 'hasCompletedSocialTour' };
    }
    // 默认是首页导览
    return { steps: homeTourSteps, storageKey: 'hasCompletedHomeTour' };
  }, [pathname, tourType]);

  const { steps, storageKey } = getTourConfig();

  // 检查是否需要登录
  const requiresAuth = pathname === '/wishlist' || pathname?.startsWith('/wishlist') || 
                       pathname === '/social' || pathname?.startsWith('/social');

  // 检查是否已完成导览
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 如果需要登录但未登录，不显示导览
    if (requiresAuth && status !== 'authenticated') {
      return;
    }

    // 如果正在加载，等待
    if (requiresAuth && status === 'loading') {
      return;
    }

    const hasCompletedTour = localStorage.getItem(storageKey);
    if (!hasCompletedTour) {
      // 延迟一下再显示，确保页面已加载
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [storageKey, requiresAuth, status]);

  // 更新目标元素位置
  const updateTargetRect = useCallback(() => {
    const step = steps[currentStep];
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.targetSelector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
      // 如果找不到元素，等待一下再试
      setTimeout(() => {
        const retryElement = document.querySelector(step.targetSelector!);
        if (retryElement) {
          const retryRect = retryElement.getBoundingClientRect();
          setTargetRect(retryRect);
        }
      }, 300);
    }
  }, [currentStep, steps]);

  // 监听窗口大小变化和滚动
  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  // 计算并更新 tooltip 位置
  const updateTooltipPosition = useCallback(() => {
    if (!targetRect || !tooltipRef.current) {
      const defaultPos = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 'min(384px, calc(90vw - 32px))',
      };
      setTooltipPosition(defaultPos);
      return;
    }

    const currentStepData = steps[currentStep];
    if (!currentStepData) {
      const defaultPos = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: 'min(384px, calc(90vw - 32px))',
      };
      setTooltipPosition(defaultPos);
      return;
    }

    const stepPosition = currentStepData.position || 'bottom';
    const padding = 20;
    const tooltipWidth = tooltipRef.current.offsetWidth || 384;
    const tooltipHeight = tooltipRef.current.offsetHeight || 200;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const safeMargin = 16;

    let position: React.CSSProperties = {
      transform: '',
      maxWidth: 'min(384px, calc(90vw - 32px))',
    };

    switch (stepPosition) {
      case 'top': {
        const topSpace = targetRect.top;
        const bottomSpace = viewportHeight - targetRect.bottom;
        
        if (topSpace >= tooltipHeight + padding + safeMargin) {
          const leftPos = Math.max(safeMargin, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - tooltipWidth / 2 - safeMargin));
          position = {
            bottom: `${viewportHeight - targetRect.top + padding}px`,
            left: `${leftPos}px`,
            transform: 'translateX(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else if (bottomSpace >= tooltipHeight + padding + safeMargin) {
          const leftPos = Math.max(safeMargin, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - tooltipWidth / 2 - safeMargin));
          position = {
            top: `${targetRect.bottom + padding}px`,
            left: `${leftPos}px`,
            transform: 'translateX(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else {
          position = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        }
        break;
      }
      case 'bottom': {
        const bottomSpace = viewportHeight - targetRect.bottom;
        const topSpace = targetRect.top;
        
        if (bottomSpace >= tooltipHeight + padding + safeMargin) {
          const leftPos = Math.max(safeMargin, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - tooltipWidth / 2 - safeMargin));
          position = {
            top: `${targetRect.bottom + padding}px`,
            left: `${leftPos}px`,
            transform: 'translateX(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else if (topSpace >= tooltipHeight + padding + safeMargin) {
          const leftPos = Math.max(safeMargin, Math.min(targetRect.left + targetRect.width / 2, viewportWidth - tooltipWidth / 2 - safeMargin));
          position = {
            bottom: `${viewportHeight - targetRect.top + padding}px`,
            left: `${leftPos}px`,
            transform: 'translateX(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else {
          position = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        }
        break;
      }
      case 'left': {
        const leftSpace = targetRect.left;
        const rightSpace = viewportWidth - targetRect.right;
        
        if (leftSpace >= tooltipWidth + padding + safeMargin) {
          const topPos = Math.max(safeMargin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, viewportHeight - tooltipHeight - safeMargin));
          position = {
            top: `${topPos}px`,
            right: `${viewportWidth - targetRect.left + padding}px`,
            transform: 'translateY(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else if (rightSpace >= tooltipWidth + padding + safeMargin) {
          const topPos = Math.max(safeMargin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, viewportHeight - tooltipHeight - safeMargin));
          position = {
            top: `${topPos}px`,
            left: `${targetRect.right + padding}px`,
            transform: 'translateY(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else {
          position = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        }
        break;
      }
      case 'right': {
        const rightSpace = viewportWidth - targetRect.right;
        const leftSpace = targetRect.left;
        
        if (rightSpace >= tooltipWidth + padding + safeMargin) {
          const topPos = Math.max(safeMargin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, viewportHeight - tooltipHeight - safeMargin));
          position = {
            top: `${topPos}px`,
            left: `${targetRect.right + padding}px`,
            transform: 'translateY(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else if (leftSpace >= tooltipWidth + padding + safeMargin) {
          const topPos = Math.max(safeMargin, Math.min(targetRect.top + targetRect.height / 2 - tooltipHeight / 2, viewportHeight - tooltipHeight - safeMargin));
          position = {
            top: `${topPos}px`,
            right: `${viewportWidth - targetRect.left + padding}px`,
            transform: 'translateY(-50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        } else {
          position = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(384px, calc(90vw - 32px))',
          };
        }
        break;
      }
      case 'center':
      default:
        position = {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxWidth: 'min(384px, calc(90vw - 32px))',
        };
        break;
    }

    setTooltipPosition(position);
  }, [targetRect, currentStep, steps]);

  // 当 tooltip 渲染后，重新计算位置（确保 tooltip 尺寸已更新）
  useEffect(() => {
    if (!isOpen) return;
    
    // 延迟一下，确保 tooltip 已完全渲染
    const timer = setTimeout(() => {
      updateTooltipPosition();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isOpen, currentStep, updateTooltipPosition]);

  // 当目标元素位置或窗口大小变化时，更新 tooltip 位置
  useEffect(() => {
    if (!isOpen) return;
    
    updateTooltipPosition();
    window.addEventListener('resize', updateTooltipPosition);
    
    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
    };
  }, [isOpen, targetRect, currentStep, updateTooltipPosition]);

  // 导航到下一步
  const handleNext = useCallback(() => {
    const step = steps[currentStep];
    
    // 执行步骤的 action（如果有）
    if (step.action) {
      step.action();
      // 等待面板打开后再继续
      setTimeout(() => {
        updateTargetRect();
      }, 300);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, steps, updateTargetRect]);

  // 导航到上一步
  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // 完成导览
  const handleComplete = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  // 跳过导览
  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const hasTarget = !!step.targetSelector && targetRect;

  // 计算 spotlight 的 clip-path
  const getClipPath = () => {
    if (!targetRect) return 'none';
    
    const padding = 8; // 高亮区域周围的padding
    const top = Math.max(0, targetRect.top - padding);
    const right = Math.max(0, window.innerWidth - targetRect.right - padding);
    const bottom = Math.max(0, window.innerHeight - targetRect.bottom - padding);
    const left = Math.max(0, targetRect.left - padding);

    return `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay with spotlight */}
          <motion.div
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: 'rgba(128, 128, 128, 0.5)',
              clipPath: hasTarget ? getClipPath() : 'none',
              pointerEvents: 'auto',
            }}
            onClick={(e) => {
              // 如果点击的是高亮区域，允许交互
              if (hasTarget && targetRect) {
                const rect = targetRect;
                const padding = 8;
                const clickX = e.clientX;
                const clickY = e.clientY;
                
                if (
                  clickX >= rect.left - padding &&
                  clickX <= rect.right + padding &&
                  clickY >= rect.top - padding &&
                  clickY <= rect.bottom + padding
                ) {
                  return; // 允许点击高亮区域
                }
              }
              // 否则阻止点击
              e.stopPropagation();
            }}
          />

          {/* Spotlight highlight border */}
          {hasTarget && targetRect && (
            <motion.div
              className="fixed z-[101] pointer-events-none"
              style={{
                top: `${targetRect.top - 8}px`,
                left: `${targetRect.left - 8}px`,
                width: `${targetRect.width + 16}px`,
                height: `${targetRect.height + 16}px`,
                border: '3px solid #8D7051',
                borderRadius: '8px',
                boxShadow: '0 0 0 9999px rgba(186, 199, 229, 0.2), 0 0 20px rgba(141, 112, 81, 0.5)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Tooltip Card */}
          <motion.div
            ref={tooltipRef}
            className="fixed z-[102] bg-white rounded-lg shadow-2xl max-w-md"
            style={{
              border: '1px solid #d6c3a1',
              ...tooltipPosition,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6">
              {/* Step indicator and close button */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: '#8D7051' }}
                >
                  {currentStep + 1}
                </div>
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="跳過導覽"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold mb-2" style={{ color: '#4a3828' }}>
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-sm mb-6" style={{ color: '#6b5b4c', lineHeight: '1.6' }}>
                {step.description}
              </p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="flex items-center gap-2"
                  style={{
                    borderColor: '#d6c3a1',
                    color: '#4a3828',
                    backgroundColor: isFirstStep ? 'transparent' : 'rgba(141, 112, 81, 0.1)',
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </Button>

                <div className="flex items-center gap-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: index === currentStep ? '#8D7051' : '#d6c3a1',
                        opacity: index === currentStep ? 1 : 0.4,
                      }}
                    />
                  ))}
                </div>

                {isLastStep ? (
                  <Button
                    onClick={handleComplete}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: '#8D7051',
                      color: 'white',
                    }}
                  >
                    完成
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="flex items-center gap-2"
                    style={{
                      backgroundColor: '#8D7051',
                      color: 'white',
                    }}
                  >
                    下一步
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
