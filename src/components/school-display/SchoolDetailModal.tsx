'use client';

import { SchoolWithMatch } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return trimmed;
}

function renderTextWithLinks(
  text: string,
  opts: { variant: 'wishlist' | 'glass' }
) {
  const linkClass =
    opts.variant === 'wishlist'
      ? '!text-blue-600 underline underline-offset-2 hover:!text-blue-700 font-medium'
      : 'text-blue-300 underline underline-offset-2 hover:text-blue-200';

  const nodes: (string | React.ReactElement)[] = [];
  const re =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\[(https?:\/\/[^\s\]]+)\]|(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1] && match[2]) {
      const url = normalizeUrl(match[2]);
      nodes.push(
        <a
          key={`a-${key++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          title={url}
        >
          {match[1]}
        </a>
      );
      lastIndex = re.lastIndex;
      continue;
    }

    const rawUrl = match[3] || match[4] || match[5] || '';
    const url = normalizeUrl(rawUrl);
    const label = match[3] ? '前往連結' : url;

    if (match[3] && nodes.length > 0) {
      const last = nodes[nodes.length - 1];
      if (typeof last === 'string') {
        const cleaned = last.replace(/(此連結|此链接|前往連結|前往链接)\s*$/u, '');
        nodes[nodes.length - 1] = cleaned;
      }
    }

    nodes.push(
      <a
        key={`a-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        title={url}
      >
        {label}
      </a>
    );

    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface SchoolDetailModalProps {
  school: SchoolWithMatch | null;
  open: boolean;
  onClose: () => void;
  variant?: 'wishlist' | 'default';
  presentation?: 'modal' | 'side';
}

export default function SchoolDetailModal({
  school,
  open,
  onClose,
  variant = 'wishlist',
  presentation = 'modal',
}: SchoolDetailModalProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isWishlist = variant === 'wishlist';
  const isSide = presentation === 'side';
  const sidePanelRef = useRef<HTMLDivElement | null>(null);

  // Side panel: allow map interactions; only close on real "click outside" (not drag/zoom, not marker click).
  useEffect(() => {
    if (!open || !isSide) return;

    const state = {
      down: false,
      startX: 0,
      startY: 0,
      target: null as EventTarget | null,
    };

    const onPointerDown = (e: PointerEvent) => {
      const panel = sidePanelRef.current;
      const target = e.target as HTMLElement | null;
      if (!panel || !target) return;

      // If click inside panel, ignore.
      if (panel.contains(target)) return;

      // If clicking a marker, don't close (should open new popup / update selection).
      if (target.closest?.('[data-map-marker=\"true\"]')) return;

      state.down = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      state.target = e.target;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!state.down) return;
      state.down = false;

      const dx = Math.abs(e.clientX - state.startX);
      const dy = Math.abs(e.clientY - state.startY);
      const isClick = dx < 6 && dy < 6;
      if (!isClick) return; // drag -> do nothing

      // click outside panel (and not on marker) -> close
      onClose();
    };

    // capture=true so we can measure drag before React handlers run
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', onPointerUp, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
    };
  }, [open, isSide, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !school) {
    return null;
  }

  const inWishlist = isInWishlist(school.id);

  // 渲染詳細內容（兩種模式共用）
  const renderContent = () => (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={isWishlist ? 'text-2xl font-semibold text-[#4a3828] truncate' : 'text-2xl font-semibold truncate'}>
            {school.name_zh}
          </h2>
          <p className={isWishlist ? 'mt-1 text-sm text-[#6b5b4c] truncate' : 'mt-1 text-sm text-white/70 truncate'}>
            {school.name_en}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={
              isWishlist
                ? 'bg-transparent text-[#6b5b4c] border border-[#d6c3a1] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]'
                : 'bg-transparent text-white border border-white/30 hover:bg-white/20 hover:text-white hover:ring-1 hover:ring-white/30'
            }
          >
            <Link href={`/social/boards/school/${school.id}`} className="flex items-center gap-2">
              <img src="/tangyuan-1.svg" alt="Logo" className="w-4 h-4" />
              討論
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (inWishlist) removeFromWishlist(school.id);
              else addToWishlist(school);
            }}
            className={
              isWishlist
                ? 'bg-transparent text-[#6b5b4c] border border-[#d6c3a1] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]'
                : 'bg-transparent text-white border border-white/30 hover:bg-white/20 hover:text-white hover:ring-1 hover:ring-white/30'
            }
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-current text-red-500' : (isWishlist ? 'text-[#8a7a63]' : '')}`} />
          </Button>
        </div>
      </header>

      <div className="mt-6 space-y-5">
        {/* 基本資訊 */}
        <div>
          <h3 className={isWishlist ? 'font-semibold text-lg mb-2 text-[#4a3828]' : 'font-semibold text-lg mb-2'}>
            基本資訊
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>國家:</span>
              <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.country}</span>
            </div>
            <div>
              <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>英文國家名:</span>
              <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.country_en || '未提供'}</span>
            </div>
            <div>
              <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>地區:</span>
              <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.region}</span>
            </div>
            <div>
              <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>名額:</span>
              <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.quota}</span>
            </div>
            <div>
              <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>二次交換:</span>
              <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>
                {school.second_exchange_eligible ? (
                  <span className="text-green-600">✓ 可申請</span>
                ) : (
                  <span className="text-red-600">✗ 不可申請</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 申請資格 */}
        <div>
          <h3 className={isWishlist ? 'font-semibold text-lg mb-2 text-[#4a3828]' : 'font-semibold text-lg mb-2'}>
            申請資格
          </h3>
          <div className="space-y-2 text-sm">
            {school.restricted_colleges && school.restricted_colleges !== '無' && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>不接受申請之學院:</span>
                <p className="mt-1 text-red-600">{school.restricted_colleges}</p>
              </div>
            )}

            {school.application_group && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>申請組別:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.application_group}</span>
              </div>
            )}

            {school.grade_requirement && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>年級限制:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.grade_requirement}</span>
              </div>
            )}

            {school.gpa_requirement && school.gpa_requirement !== '無' && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>GPA 要求:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.gpa_requirement}</span>
              </div>
            )}

            {school.gpa_min && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>GPA 最低要求:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.gpa_min}</span>
              </div>
            )}

            {school.language_requirement && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>語言要求: </span>
                <span className={isWishlist ? 'font-medium' : 'font-medium text-white'}>
                  {renderTextWithLinks(school.language_requirement, { variant: isWishlist ? 'wishlist' : 'glass' })}
                </span>
              </div>
            )}

            {school.other_language && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>其他語言要求:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.other_language}</span>
              </div>
            )}
          </div>
        </div>

        {/* 其他資訊 */}
        <div>
          <h3 className={isWishlist ? 'font-semibold text-lg mb-2 text-[#4a3828]' : 'font-semibold text-lg mb-2'}>
            其他資訊
          </h3>
          <div className="space-y-2 text-sm">
            {school.academic_calendar && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>學校年曆:</span>
                <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>
                  {renderTextWithLinks(school.academic_calendar, { variant: isWishlist ? 'wishlist' : 'glass' })}
                </p>
              </div>
            )}

            {school.registration_fee && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>註冊繳費:</span>
                <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>
                  {renderTextWithLinks(school.registration_fee, { variant: isWishlist ? 'wishlist' : 'glass' })}
                </p>
              </div>
            )}

            {school.accommodation_info && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>住宿資訊:</span>
                <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>
                  {renderTextWithLinks(school.accommodation_info, { variant: isWishlist ? 'wishlist' : 'glass' })}
                </p>
              </div>
            )}

            {school.tuition && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>學費:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.tuition}</span>
              </div>
            )}

            {school.notes && (
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>注意事項:</span>
                <p
                  className={
                    isWishlist
                      ? 'mt-1 bg-[#f9f3ea] border border-[#e8ddc8] p-3 rounded-lg text-[#4a3828]'
                      : 'mt-1 bg-white/10 border border-white/20 p-3 rounded-lg text-white'
                  }
                >
                  {renderTextWithLinks(school.notes, { variant: isWishlist ? 'wishlist' : 'glass' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => window.open(school.url, '_blank')}
            className={
              isWishlist
                ? 'w-full border-[#a07a52] text-[#4a3828] bg-white hover:bg-[#f5ede1] hover:text-[#3b2a1c]'
                : 'w-full'
            }
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            前往 OIA 官網
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <PanelOverlay
      isVisible={open}
      onClose={onClose}
      panelType="wishlist"
      variant={isWishlist ? 'wishlist' : 'glass'}
      zIndex={isSide ? 80 : 40}
      overlayStyle={isSide ? 'none' : 'default'}
      contentAnimation={isSide ? 'none' : 'default'}
      closeOnBackdropClick={!isSide}
    >
      {isSide ? (
        // Side panel mode: 右側滑入
        <motion.div
          ref={sidePanelRef}
          className={
            isWishlist
              ? 'fixed right-0 top-0 bottom-0 h-full bg-white border border-[#d6c3a1] shadow-xl overflow-hidden text-[#4a3828]'
              : 'fixed right-0 top-0 bottom-0 h-full bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl overflow-hidden text-white'
          }
          style={{
            width: '480px',
            zIndex: 9999,
            borderTopLeftRadius: '0.75rem',
            borderBottomLeftRadius: '0.75rem',
            borderTopRightRadius: '0px',
            borderBottomRightRadius: '0px',
          }}
          onMouseDown={(e) => e.stopPropagation()}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Close button - 左上角 */}
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className={
              isWishlist
                ? 'absolute left-4 top-4 z-10 rounded-md p-2 text-[#6b5b4c] border border-[#d6c3a1] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                : 'absolute left-4 top-4 z-10 rounded-md p-2 text-white/80 border border-white/30 hover:bg-white/20 hover:text-white hover:ring-1 hover:ring-white/30 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-x w-4 h-4"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="h-full overflow-y-auto p-6 pt-16">
            {renderContent()}
          </div>
        </motion.div>
      ) : (
        // Modal mode: 中間彈窗
        <div
          className="fixed inset-0 flex items-start justify-center p-4 pt-24"
          onMouseDown={() => onClose()}
        >
          <motion.div
            className={
              isWishlist
                ? 'relative w-full max-w-2xl bg-white border border-[#d6c3a1] shadow-xl rounded-xl overflow-hidden text-[#4a3828]'
                : 'relative w-full max-w-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl rounded-3xl overflow-hidden text-white'
            }
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="max-h-[80vh] flex flex-col">
              {/* Row 1: close (own row) */}
              <div className="flex items-center justify-end p-4 pb-2">
                <button
                  type="button"
                  aria-label="關閉"
                  onClick={onClose}
                  className={
                    isWishlist
                      ? 'rounded-md p-2 text-[#6b5b4c] border border-[#d6c3a1] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                      : 'rounded-md p-2 text-white/80 border border-white/30 hover:bg-white/20 hover:text-white hover:ring-1 hover:ring-white/30 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-x w-4 h-4"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* Row 2+: title + actions + rest */}
              <div className="overflow-y-auto p-6 pt-2">
                {renderContent()}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PanelOverlay>
  );
}
