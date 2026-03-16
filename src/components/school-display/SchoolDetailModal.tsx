'use client';

import { SchoolWithMatch } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { motion } from 'framer-motion';
import Link from 'next/link';

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('www.')) return `https://${trimmed}`;
  return trimmed;
}

/** 把 sections 的 links[] 按順序注入到文字中（以 link.text 為 anchor text 搜尋替換） */
function injectSectionLinks(
  text: string,
  links: Array<{ text: string; href: string }> | undefined,
  opts: { variant: 'wishlist' | 'glass' }
): (string | React.ReactElement)[] {
  if (!links || links.length === 0) return renderTextWithLinks(text, opts);

  const linkClass =
    opts.variant === 'wishlist'
      ? '!text-blue-600 underline underline-offset-2 hover:!text-blue-700 font-medium'
      : 'text-blue-300 underline underline-offset-2 hover:text-blue-200';

  const nodes: (string | React.ReactElement)[] = [];
  let remaining = text;
  let key = 0;

  for (const link of links) {
    const idx = remaining.indexOf(link.text);
    if (idx === -1) continue;
    if (idx > 0) nodes.push(...renderTextWithLinks(remaining.slice(0, idx), opts));
    nodes.push(
      <a key={`sl-${key++}`} href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {link.text}
      </a>
    );
    remaining = remaining.slice(idx + link.text.length);
  }
  if (remaining) nodes.push(...renderTextWithLinks(remaining, opts));
  return nodes;
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
  showDiscussButton?: boolean;
}

export default function SchoolDetailModal({
  school,
  open,
  onClose,
  variant = 'wishlist',
  presentation = 'modal',
  showDiscussButton = true,
}: SchoolDetailModalProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isWishlist = variant === 'wishlist';
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isSide = presentation === 'side' && !isMobile;
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

  useEffect(() => {
    if (open && school) {
      posthog.capture('school_viewed', { school_id: school.id, school_name: school.name_zh, country: school.country });
    }
  }, [open, school]);

  if (!open || !school) {
    return null;
  }

  const inWishlist = isInWishlist(school.id);

  // 討論與收藏按鈕（modal 頂列與內容區共用）
  const actionButtons = (
    <div className="flex items-center gap-2 flex-shrink-0">
      {showDiscussButton && (
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
      )}
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
  );

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
          <span className={`inline-block text-xs font-medium py-0.5 rounded-full mt-1.5 ${
            school.is_updated
              ? 'bg-green-100 text-green-600'
              : 'bg-red-100 text-red-600'
          }`}>
            {school.is_updated ? '資料已更新' : '資料未更新'}
          </span>
        </div>
        {actionButtons}
      </header>

      <div className="mt-6 space-y-5">
        {/* ── 基本資訊 ─────────────────────────────── */}
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

        {/* ── 申請資格（固定結構化欄位）────────────── */}
        {(school.restricted_colleges || school.language_group || school.grade_requirement ||
          school.no_fail_required || school.gpa_min || school.toefl_ibt || school.ielts ||
          school.toeic || school.gept || school.language_cefr || school.jlpt) && (
          <div>
            <h3 className={isWishlist ? 'font-semibold text-lg mb-2 text-[#4a3828]' : 'font-semibold text-lg mb-2'}>
              申請資格
            </h3>
            <div className="space-y-2 text-sm">
              {school.restricted_colleges && school.restricted_colleges !== '無' && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>不接受申請之學院:</span>
                  <span className="ml-2 text-red-500 font-medium">{school.restricted_colleges}</span>
                </div>
              )}
              {school.language_group && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>申請組別:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.language_group}</span>
                </div>
              )}
              {school.grade_requirement && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>年級限制:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.grade_requirement}</span>
                </div>
              )}
              {school.no_fail_required && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>不及格限制:</span>
                  <span className="ml-2 font-medium text-orange-500">歷年不得有不及格紀錄</span>
                </div>
              )}
              {school.gpa_min !== null && school.gpa_min !== undefined && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>GPA 要求:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.gpa_min} 以上</span>
                </div>
              )}
              {school.toefl_ibt && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>TOEFL iBT:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.toefl_ibt} 以上</span>
                </div>
              )}
              {school.ielts && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>IELTS:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.ielts} 以上</span>
                </div>
              )}
              {school.toeic && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>TOEIC:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.toeic} 以上</span>
                </div>
              )}
              {school.gept && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>全民英檢:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>英檢{school.gept}以上</span>
                </div>
              )}
              {school.language_cefr && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>CEFR:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.language_cefr} 以上</span>
                </div>
              )}
              {school.jlpt && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>日語能力:</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>JLPT {school.jlpt}</span>
                </div>
              )}
              {(() => {
                const sec = school.sections?.find(s => s.label === '申請資格');
                if (!sec) return null;
                // 只過濾「單純標籤行」和格式固定不會有學院特例的項目
                // 語言要求（TOEFL/IELTS…）可能有一般版和學院特例版，保留完整文字
                const filters: RegExp[] = [
                  // 動態比對 language_group 標籤行（如「中語組」「日語組」等）
                  ...(school.language_group ? [new RegExp(`^${school.language_group}\\s*$`)] : []),
                  ...(school.grade_requirement ? [/年級/] : []),
                  ...(school.no_fail_required ? [/不及格/] : []),
                  ...(school.gpa_min !== null ? [/GPA/i] : []),
                ];
                // 正規化 restricted_colleges 用於比對重複行
                const restrictedNorm = school.restricted_colleges && school.restricted_colleges !== '無'
                  ? school.restricted_colleges.replace(/[。、，,\s]/g, '')
                  : '';
                const remaining = sec.text
                  .split('\n')
                  .filter(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return false;
                    if (filters.some(re => re.test(trimmed))) return false;
                    // 過濾與 restricted_colleges 重複的行
                    if (restrictedNorm && trimmed.replace(/[。、，,\s]/g, '').includes(restrictedNorm)) return false;
                    return true;
                  })
                  .join('\n')
                  .trim();
                if (!remaining) return null;
                return (
                  <div className="mt-2 pt-2 border-t border-dashed border-current/20">
                    <p className={`whitespace-pre-line text-xs ${isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}`}>
                      {injectSectionLinks(remaining, sec.links, { variant: isWishlist ? 'wishlist' : 'glass' })}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── 其他資訊（動態 sections / fallback 舊欄位）── */}
        <div>
          <h3 className={isWishlist ? 'font-semibold text-lg mb-2 text-[#4a3828]' : 'font-semibold text-lg mb-2'}>
            其他資訊
          </h3>
          <div className="space-y-3 text-sm">
            {school.sections && school.sections.length > 0 ? (
              school.sections
                .filter(sec => !['申請資格', '名額', '此校開放予第二次出國交換之同學選填'].includes(sec.label))
                .map((sec, i) => {
                  const isWarning = sec.label === '注意事項' || sec.label.startsWith('⚠️');
                  const variant = isWishlist ? 'wishlist' : 'glass';
                  return (
                    <div key={i}>
                      <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>{sec.label}:</span>
                      <p className={`mt-1 whitespace-pre-line ${
                        isWarning
                          ? isWishlist
                            ? 'bg-[#f9f3ea] border border-[#e8ddc8] p-3 rounded-lg text-[#4a3828]'
                            : 'bg-white/10 border border-white/20 p-3 rounded-lg text-white'
                          : isWishlist ? '' : 'text-white'
                      }`}>
                        {injectSectionLinks(sec.text, sec.links, { variant })}
                      </p>
                    </div>
                  );
                })
            ) : (
              <p className={isWishlist ? 'text-[#8a7a63] text-sm' : 'text-white/50 text-sm'}>尚無詳細資訊</p>
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => {
              posthog.capture('school_external_link_clicked', { school_id: school.id, school_name: school.name_zh, url: school.url });
              window.open(school.url, '_blank');
            }}
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
      zIndex={isSide ? 100 : 100}
      overlayStyle={isSide ? 'none' : 'default'}
      contentAnimation="none"
      closeOnBackdropClick={!isSide}
    >
      {isSide ? (
        // Side panel mode: 右側滑入
        <motion.div
          ref={sidePanelRef}
          className={
            isWishlist
              ? 'fixed right-0 top-0 bottom-0 h-full bg-white border border-[#d6c3a1] shadow-xl overflow-hidden text-[#4a3828] flex flex-col'
              : 'fixed right-0 top-0 bottom-0 h-full bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl overflow-hidden text-white flex flex-col'
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
          {/* Sticky header with close button - 固定在頂部 */}
          <div className="flex-shrink-0 sticky top-0 z-10 flex justify-start p-4 bg-inherit">
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

          {/* 可滾動的內容區域 */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pt-4 pb-6">
              {renderContent()}
            </div>
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
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="max-h-[80vh] flex flex-col">
              {/* 第一列：叉叉在右邊（與下方愛心同一垂直線，用相同 px 對齊） */}
              <div className="flex items-center justify-end px-4 pt-4 pb-2 flex-shrink-0">
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

              {/* 可滾動：標題 + 討論/愛心 + 內容（與上列同 px-4，叉叉與愛心垂直對齊） */}
              <div className="overflow-y-auto px-4 pt-2 pb-6">
                {renderContent()}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </PanelOverlay>
  );
}
