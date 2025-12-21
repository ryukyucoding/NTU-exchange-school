'use client';

import { SchoolWithMatch } from '@/types/school';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import PanelOverlay from '@/components/layout/PanelOverlay';
import { useEffect } from 'react';

interface SchoolDetailModalProps {
  school: SchoolWithMatch | null;
  open: boolean;
  onClose: () => void;
  variant?: 'wishlist' | 'default';
}

export default function SchoolDetailModal({
  school,
  open,
  onClose,
  variant = 'wishlist',
}: SchoolDetailModalProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const isWishlist = variant === 'wishlist';

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!school) return null;

  const inWishlist = isInWishlist(school.id);

  return (
    <PanelOverlay
      isVisible={open}
      onClose={onClose}
      panelType="wishlist"
      variant={isWishlist ? 'wishlist' : 'glass'}
    >
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
        <div
          className={
            isWishlist
              ? 'relative w-full max-w-2xl bg-white border border-[#d6c3a1] shadow-xl rounded-xl overflow-hidden text-[#4a3828]'
              : 'relative w-full max-w-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl rounded-3xl overflow-hidden text-white'
          }
        >
          {/* Close button */}
          <button
            type="button"
            aria-label="關閉"
            onClick={onClose}
            className={
              isWishlist
                ? 'absolute right-4 top-4 z-10 rounded-md p-2 text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
                : 'absolute right-4 top-4 z-10 rounded-md p-2 text-white/80 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0'
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

          <div className="max-h-[80vh] overflow-y-auto p-6">
            <header className="pr-10">
              <h2 className={isWishlist ? 'text-2xl font-semibold text-[#4a3828]' : 'text-2xl font-semibold'}>
                {school.name_zh}
              </h2>
              <p className={isWishlist ? 'mt-1 text-sm text-[#6b5b4c]' : 'mt-1 text-sm text-white/70'}>
                {school.name_en}
              </p>
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
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>GPA 最低要求 (解析後):</span>
                  <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.gpa_min}</span>
                </div>
              )}

              {school.language_requirement && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>語言要求:</span>
                  <p className={isWishlist ? 'mt-1 text-sm' : 'mt-1 text-sm text-white'}>{school.language_requirement}</p>
                </div>
              )}

              {(school.toefl_ibt || school.ielts || school.toeic) && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>英文能力要求 (解析後):</span>
                  <div className={isWishlist ? 'mt-1 space-y-1' : 'mt-1 space-y-1 text-white'}>
                    {school.toefl_ibt && (
                      <div>• TOEFL iBT: {school.toefl_ibt}</div>
                    )}
                    {school.ielts && (
                      <div>• IELTS: {school.ielts}</div>
                    )}
                    {school.toeic && (
                      <div>• TOEIC: {school.toeic}</div>
                    )}
                  </div>
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
              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>名額:</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.quota}</span>
              </div>

              {school.academic_calendar && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>學校年曆:</span>
                  <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>{school.academic_calendar}</p>
                </div>
              )}

              {school.registration_fee && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>註冊繳費:</span>
                  <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>{school.registration_fee}</p>
                </div>
              )}

              {school.accommodation_info && (
                <div>
                  <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>住宿資訊:</span>
                  <p className={isWishlist ? 'mt-1' : 'mt-1 text-white'}>{school.accommodation_info}</p>
                </div>
              )}

              <div>
                <span className={isWishlist ? 'text-[#6b5b4c]' : 'text-white/70'}>開放學期 (解析後):</span>
                <span className={isWishlist ? 'ml-2 font-medium' : 'ml-2 font-medium text-white'}>{school.semesters.join(', ')}</span>
              </div>

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
                    {school.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2 pt-4">
            <Button
              className={
                isWishlist
                  ? `flex-1 ${
                      inWishlist
                        ? 'bg-[#f5ede1] text-[#4a3828] border border-[#d6c3a1] hover:bg-[#e8ddc8]'
                        : 'bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f]'
                    }`
                  : 'flex-1'
              }
              variant={inWishlist ? "default" : "outline"}
              onClick={() => {
                if (inWishlist) {
                  removeFromWishlist(school.id);
                } else {
                  addToWishlist(school);
                }
              }}
            >
              <Heart className={`w-4 h-4 mr-2 ${inWishlist ? "fill-current" : ""}`} />
              {inWishlist ? '已收藏' : '加入收藏'}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(school.url, '_blank')}
              className={isWishlist ? 'border-[#a07a52] text-[#4a3828] bg-white hover:bg-[#f5ede1]' : undefined}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              前往 OIA 官網
            </Button>
          </div>
            </div>
          </div>
        </div>
      </div>
    </PanelOverlay>
  );
}
