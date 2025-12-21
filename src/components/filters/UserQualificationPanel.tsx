'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserQualificationPanelProps {
  onApply?: () => void;
  isHighZoom?: boolean;
  variant?: 'glass' | 'wishlist';
}

export default function UserQualificationPanel({
  onApply,
  isHighZoom = false,
  variant = 'glass',
}: UserQualificationPanelProps) {
  const { user, setUser, resetUser } = useUserContext();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  const handleApplyFilter = async () => {
    const hasAnyQualification =
      user.college !== null ||
      user.grade !== null ||
      user.gpa !== null ||
      user.toefl !== null ||
      user.ielts !== null ||
      user.toeic !== null;

    if (!hasAnyQualification) {
      toast('請先填寫至少一項資格', { icon: 'ℹ️' });
      return;
    }

    // 如果未登入，只套用篩選但不保存
    if (!session) {
      toast.success('已套用資格篩選（未登入，不會保存）');
      // 自動收起面板
      if (onApply) {
        setTimeout(() => {
          onApply();
        }, 300);
      }
      return;
    }

    // 如果已登入，保存到資料庫
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/qualification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('已套用資格篩選並保存');
          // 自動收起面板
          if (onApply) {
            setTimeout(() => {
              onApply();
            }, 300); // 稍微延遲，讓 toast 顯示
          }
        } else {
          throw new Error(data.error || data.details || '保存失敗');
        }
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error || '保存失敗');
      }
    } catch (error: unknown) {
      console.error('Failed to save qualification:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      toast.error(`保存失敗: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFilter = async () => {
    resetUser();
    toast.success('已清除所有篩選條件');
    // 自動收起面板
    if (onApply) {
      setTimeout(() => {
        onApply();
      }, 300); // 稍微延遲，讓 toast 顯示
    }
  };

  const colleges = [
    '文學院', '理學院', '社會科學院', '醫學院', '工學院',
    '生農學院', '管理學院', '公衛學院', '電資學院', '法律學院', '生科學院'
  ];

  const grades = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

  return (
    <div className="w-full space-y-4">
        {/* 學院選擇 */}
        <div>
          <Label
            htmlFor="college"
            className={`font-medium transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
            }`}
          >
            學院
          </Label>
          <Select
            value={user.college || ''}
            onValueChange={(value) => setUser({ ...user, college: value })}
          >
            <SelectTrigger
              id="college"
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1] text-[#4a3828] data-[placeholder]:text-[#8a7a63] focus:ring-[#d6c3a1] hover:bg-[#f5ede1] hover:text-[#4a3828] transition-colors'
                  : `transition-all duration-300 ${
                      isHighZoom
                        ? 'bg-white/20 border-white/30 text-gray-800 data-[placeholder]:text-gray-600'
                        : 'bg-white/10 border-white/30 text-white data-[placeholder]:text-white/70'
                    }`
              }
            >
              <SelectValue placeholder="請選擇學院" />
            </SelectTrigger>
            <SelectContent
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1]'
                  : `backdrop-blur-md transition-all duration-300 ${
                      isHighZoom ? 'bg-white/30 border-white/35' : 'bg-white/20 border-white/30'
                    }`
              }
            >
              {colleges.map(college => (
                <SelectItem 
                  key={college} 
                  value={college} 
                  className={
                    variant === 'wishlist'
                      ? 'text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828] focus:bg-[#f5ede1] focus:text-[#4a3828]'
                      : `transition-all duration-300 ${
                          isHighZoom ? 'text-gray-800 hover:bg-white/30' : 'text-white hover:bg-white/20'
                        }`
                  }
                >
                  {college}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 年級選擇 */}
        <div>
          <Label
            htmlFor="grade"
            className={`font-medium transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
            }`}
          >
            年級
          </Label>
          <Select
            value={user.grade || ''}
            onValueChange={(value: string) => setUser({ ...user, grade: value as 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | null })}
          >
            <SelectTrigger
              id="grade"
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1] text-[#4a3828] data-[placeholder]:text-[#8a7a63] focus:ring-[#d6c3a1] hover:bg-[#f5ede1] hover:text-[#4a3828] transition-colors'
                  : `transition-all duration-300 ${
                      isHighZoom
                        ? 'bg-white/20 border-white/30 text-gray-800 data-[placeholder]:text-gray-600'
                        : 'bg-white/10 border-white/30 text-white data-[placeholder]:text-white/70'
                    }`
              }
            >
              <SelectValue placeholder="請選擇年級" />
            </SelectTrigger>
            <SelectContent
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1]'
                  : `backdrop-blur-md transition-all duration-300 ${
                      isHighZoom ? 'bg-white/30 border-white/35' : 'bg-white/20 border-white/30'
                    }`
              }
            >
              {grades.map(grade => (
                <SelectItem 
                  key={grade} 
                  value={grade} 
                  className={
                    variant === 'wishlist'
                      ? 'text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828] focus:bg-[#f5ede1] focus:text-[#4a3828]'
                      : `transition-all duration-300 ${
                          isHighZoom ? 'text-gray-800 hover:bg-white/30' : 'text-white hover:bg-white/20'
                        }`
                  }
                >
                  {grade === 'Freshman' && '大一'}
                  {grade === 'Sophomore' && '大二'}
                  {grade === 'Junior' && '大三'}
                  {grade === 'Senior' && '大四'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPA 輸入 */}
        <div>
          <Label
            htmlFor="gpa"
            className={`font-medium transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
            }`}
          >
            GPA
          </Label>
          <Input
            id="gpa"
            type="number"
            min={0}
            max={4.3}
            step={0.01}
            value={user.gpa ?? ''}
            onChange={(e) => setUser({ ...user, gpa: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="例如: 3.8"
            className={
              variant === 'wishlist'
                ? 'bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
                : `transition-all duration-300 ${
                    isHighZoom
                      ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600'
                      : 'bg-white/10 border-white/30 text-white placeholder:text-white/70'
                  }`
            }
          />
          <p
            className={`text-xs mt-1 transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#8a7a63]' : (isHighZoom ? 'text-gray-600' : 'text-white/70')
            }`}
          >
            滿分 4.3
          </p>
        </div>

        {/* 語言成績 */}
        <div className="space-y-3">
          <Label
            className={`text-base font-semibold transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
            }`}
          >
            語言成績
          </Label>

          <div>
            <Label
              htmlFor="toefl"
              className={`font-medium transition-all duration-300 ${
                variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
              }`}
            >
              TOEFL iBT
            </Label>
            <Input
              id="toefl"
              type="number"
              min={0}
              max={120}
              value={user.toefl ?? ''}
              onChange={(e) => setUser({ ...user, toefl: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 90"
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
                  : `transition-all duration-300 ${
                      isHighZoom
                        ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600'
                        : 'bg-white/10 border-white/30 text-white placeholder:text-white/70'
                    }`
              }
            />
          </div>

          <div>
            <Label
              htmlFor="ielts"
              className={`font-medium transition-all duration-300 ${
                variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
              }`}
            >
              IELTS
            </Label>
            <Input
              id="ielts"
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={user.ielts ?? ''}
              onChange={(e) => setUser({ ...user, ielts: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="例如: 7.0"
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
                  : `transition-all duration-300 ${
                      isHighZoom
                        ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600'
                        : 'bg-white/10 border-white/30 text-white placeholder:text-white/70'
                    }`
              }
            />
          </div>

          <div>
            <Label
              htmlFor="toeic"
              className={`font-medium transition-all duration-300 ${
                variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
              }`}
            >
              TOEIC
            </Label>
            <Input
              id="toeic"
              type="number"
              min={0}
              max={990}
              value={user.toeic ?? ''}
              onChange={(e) => setUser({ ...user, toeic: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 850"
              className={
                variant === 'wishlist'
                  ? 'bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
                  : `transition-all duration-300 ${
                      isHighZoom
                        ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600'
                        : 'bg-white/10 border-white/30 text-white placeholder:text-white/70'
                    }`
              }
            />
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-2">
          <Button
            className={
              variant === 'wishlist'
                ? 'flex-1 bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] shadow-sm disabled:opacity-50'
                : 'flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md disabled:opacity-50'
            }
            onClick={handleApplyFilter}
            disabled={isSaving}
          >
            <Check className="w-4 h-4 mr-2" />
            {isSaving ? '保存中...' : '套用篩選'}
          </Button>
          <Button
            variant="outline"
            className={
              variant === 'wishlist'
                ? 'flex-1 bg-white border-[#a07a52] text-[#4a3828] hover:bg-[#f5ede1]'
                : `flex-1 transition-all duration-300 ${
                    isHighZoom
                      ? 'bg-white/20 border-white/30 text-gray-800 hover:bg-white/30 hover:text-gray-900'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white'
                  }`
            }
            onClick={handleClearFilter}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            清除篩選
          </Button>
        </div>
        {!session && (
          <p
            className={`text-xs text-center mt-2 transition-all duration-300 ${
              variant === 'wishlist' ? 'text-[#8a7a63]' : (isHighZoom ? 'text-gray-600' : 'text-white/70')
            }`}
          >
            登入後可保存資格設定
          </p>
        )}
    </div>
  );
}
