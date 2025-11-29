import { SchoolWithMatch } from '@/types/school';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';

interface SchoolDetailModalProps {
  school: SchoolWithMatch | null;
  open: boolean;
  onClose: () => void;
}

export default function SchoolDetailModal({ school, open, onClose }: SchoolDetailModalProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  if (!school) return null;

  const inWishlist = isInWishlist(school.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{school.name_zh}</DialogTitle>
          <DialogDescription>{school.name_en}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 基本資訊 */}
          <div>
            <h3 className="font-semibold text-lg mb-2">基本資訊</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">國家:</span>
                <span className="ml-2 font-medium">{school.country}</span>
              </div>
              <div>
                <span className="text-gray-600">英文國家名:</span>
                <span className="ml-2 font-medium">{school.country_en || '未提供'}</span>
              </div>
              <div>
                <span className="text-gray-600">地區:</span>
                <span className="ml-2 font-medium">{school.region}</span>
              </div>
              <div>
                <span className="text-gray-600">名額:</span>
                <span className="ml-2 font-medium">{school.quota}</span>
              </div>
            </div>
          </div>

          {/* 申請資格 */}
          <div>
            <h3 className="font-semibold text-lg mb-2">申請資格</h3>
            <div className="space-y-2 text-sm">
              {school.restricted_colleges && school.restricted_colleges !== '無' && (
                <div>
                  <span className="text-gray-600">不接受申請之學院:</span>
                  <p className="mt-1 text-red-600">{school.restricted_colleges}</p>
                </div>
              )}

              {school.application_group && (
                <div>
                  <span className="text-gray-600">申請組別:</span>
                  <span className="ml-2 font-medium">{school.application_group}</span>
                </div>
              )}

              {school.grade_requirement && (
                <div>
                  <span className="text-gray-600">年級限制:</span>
                  <span className="ml-2 font-medium">{school.grade_requirement}</span>
                </div>
              )}

              {school.gpa_requirement && school.gpa_requirement !== '無' && (
                <div>
                  <span className="text-gray-600">GPA 要求:</span>
                  <span className="ml-2 font-medium">{school.gpa_requirement}</span>
                </div>
              )}

              {school.gpa_min && (
                <div>
                  <span className="text-gray-600">GPA 最低要求 (解析後):</span>
                  <span className="ml-2 font-medium">{school.gpa_min}</span>
                </div>
              )}

              {school.language_requirement && (
                <div>
                  <span className="text-gray-600">語言要求:</span>
                  <p className="mt-1 text-sm">{school.language_requirement}</p>
                </div>
              )}

              {(school.toefl_ibt || school.ielts || school.toeic) && (
                <div>
                  <span className="text-gray-600">英文能力要求 (解析後):</span>
                  <div className="mt-1 space-y-1">
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
                  <span className="text-gray-600">其他語言要求:</span>
                  <span className="ml-2 font-medium">{school.other_language}</span>
                </div>
              )}
            </div>
          </div>

          {/* 其他資訊 */}
          <div>
            <h3 className="font-semibold text-lg mb-2">其他資訊</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">名額:</span>
                <span className="ml-2 font-medium">{school.quota}</span>
              </div>

              {school.academic_calendar && (
                <div>
                  <span className="text-gray-600">學校年曆:</span>
                  <p className="mt-1">{school.academic_calendar}</p>
                </div>
              )}

              {school.registration_fee && (
                <div>
                  <span className="text-gray-600">註冊繳費:</span>
                  <p className="mt-1">{school.registration_fee}</p>
                </div>
              )}

              {school.accommodation_info && (
                <div>
                  <span className="text-gray-600">住宿資訊:</span>
                  <p className="mt-1">{school.accommodation_info}</p>
                </div>
              )}

              <div>
                <span className="text-gray-600">開放學期 (解析後):</span>
                <span className="ml-2 font-medium">{school.semesters.join(', ')}</span>
              </div>

              {school.tuition && (
                <div>
                  <span className="text-gray-600">學費:</span>
                  <span className="ml-2 font-medium">{school.tuition}</span>
                </div>
              )}

              {school.notes && (
                <div>
                  <span className="text-gray-600">注意事項:</span>
                  <p className="mt-1 bg-yellow-50 p-2 rounded text-black">{school.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1"
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
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              前往 OIA 官網
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
