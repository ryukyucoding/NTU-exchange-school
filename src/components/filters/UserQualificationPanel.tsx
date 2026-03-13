'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUserContext } from '@/contexts/UserContext';
import { useFilters } from '@/contexts/FilterContext';
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
  const { filters, updateFilters } = useFilters();
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);

  // 當 user.applicationGroup 從資料庫載入時，同步到 filters
  useEffect(() => {
    if (user.applicationGroup !== null && filters.applicationGroup !== user.applicationGroup) {
      updateFilters({ applicationGroup: user.applicationGroup });
    } else if (user.applicationGroup === null && filters.applicationGroup !== null) {
      updateFilters({ applicationGroup: null });
    }
  }, [user.applicationGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilter = async () => {
    const hasAnyQualification =
      user.college !== null ||
      user.grade !== null ||
      user.gpa !== null ||
      user.toefl !== null ||
      user.ielts !== null ||
      user.toeic !== null ||
      user.gept !== null ||
      user.cefr !== null ||
      user.jlpt !== null ||
      user.noFail ||
      filters.applicationGroup !== null ||
      filters.hasQuota;

    if (!hasAnyQualification) {
      toast('請先設定至少一項篩選條件', { icon: 'ℹ️' });
      return;
    }

    if (!session) {
      toast.success('已套用資格篩選（未登入，不會保存）');
      if (onApply) setTimeout(() => onApply(), 300);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/qualification', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, applicationGroup: filters.applicationGroup }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser({ ...user, applicationGroup: filters.applicationGroup });
          toast.success('已套用資格篩選並保存');
          if (onApply) setTimeout(() => onApply(), 300);
        } else {
          throw new Error(data.error || data.details || '保存失敗');
        }
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error || '保存失敗');
      }
    } catch (error: unknown) {
      console.error('Failed to save qualification:', error);
      toast.error(`保存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFilter = async () => {
    resetUser();
    updateFilters({ applicationGroup: null, hasQuota: false });
    if (session) {
      try {
        await fetch('/api/user/qualification', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...user, applicationGroup: null }),
        });
      } catch (error) {
        console.error('Failed to clear applicationGroup:', error);
      }
    }
    toast.success('已清除所有篩選條件');
    if (onApply) setTimeout(() => onApply(), 300);
  };

  // 選項列表
  const colleges = [
    '文學院', '理學院', '社會科學院', '醫學院', '工學院',
    '生農學院', '管理學院', '公衛學院', '電資學院', '法律學院', '生科學院',
  ];
  const grades = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Master1', 'Master2'];
  const gradeLabels: Record<string, string> = {
    Freshman: '大一', Sophomore: '大二', Junior: '大三', Senior: '大四',
    Master1: '碩一', Master2: '碩二',
  };
  const APPLICATION_GROUP_ALL = '__all__';
  const applicationGroups = ['一般組', '法語組', '德語組', '西語組', '日語組', '中語組', '韓語組'];
  const geptLevels = ['初級', '中級', '中高級', '高級'];
  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const jlptLevels = ['N5', 'N4', 'N3', 'N2', 'N1'];

  const safeApplicationGroupValue =
    filters.applicationGroup && applicationGroups.includes(filters.applicationGroup)
      ? filters.applicationGroup
      : APPLICATION_GROUP_ALL;

  // 共用 className
  const triggerCls = variant === 'wishlist'
    ? 'bg-white border-[#d6c3a1] text-[#4a3828] data-[placeholder]:text-[#8a7a63] focus:ring-[#d6c3a1] hover:bg-[#f5ede1] transition-colors'
    : `transition-all duration-300 ${isHighZoom ? 'bg-white/20 border-white/30 text-gray-800 data-[placeholder]:text-gray-600' : 'bg-white/10 border-white/30 text-white data-[placeholder]:text-white/70'}`;

  const contentCls = variant === 'wishlist'
    ? 'bg-white border-[#d6c3a1]'
    : `backdrop-blur-md transition-all duration-300 ${isHighZoom ? 'bg-white/30 border-white/35' : 'bg-white/20 border-white/30'}`;

  const itemCls = variant === 'wishlist'
    ? 'text-[#4a3828] hover:bg-[#f5ede1] focus:bg-[#f5ede1]'
    : `transition-all duration-300 ${isHighZoom ? 'text-gray-800 hover:bg-white/30' : 'text-white hover:bg-white/20'}`;

  const labelCls = `font-medium transition-all duration-300 ${
    variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
  }`;

  const inputCls = variant === 'wishlist'
    ? 'bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
    : `transition-all duration-300 ${isHighZoom ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600' : 'bg-white/10 border-white/30 text-white placeholder:text-white/70'}`;


  const mutedCls = `text-xs transition-all duration-300 ${
    variant === 'wishlist' ? 'text-[#8a7a63]' : (isHighZoom ? 'text-gray-600' : 'text-white/70')
  }`;

  const sectionLabelCls = `text-base font-semibold transition-all duration-300 ${
    variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
  }`;

  return (
    <div className="w-full flex flex-col">
      {/* 可捲動欄位區 */}
      <div className="space-y-4 pr-1 pb-1">

        {/* 年級 */}
        <div>
          <Label htmlFor="grade" className={labelCls}>年級</Label>
          <Select
            value={user.grade || ''}
            onValueChange={(v) => setUser({ ...user, grade: v as typeof user.grade })}
          >
            <SelectTrigger id="grade" className={triggerCls}>
              <SelectValue placeholder="請選擇年級" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              {grades.map(g => (
                <SelectItem key={g} value={g} className={itemCls}>{gradeLabels[g]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 學院 */}
        <div>
          <Label htmlFor="college" className={labelCls}>學院</Label>
          <Select value={user.college || ''} onValueChange={(v) => setUser({ ...user, college: v })}>
            <SelectTrigger id="college" className={triggerCls}>
              <SelectValue placeholder="請選擇學院" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              {colleges.map(c => (
                <SelectItem key={c} value={c} className={itemCls}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 申請組別 */}
        <div>
          <Label htmlFor="application-group" className={labelCls}>申請組別</Label>
          <Select
            value={safeApplicationGroupValue}
            onValueChange={(v) => updateFilters({ applicationGroup: v === APPLICATION_GROUP_ALL ? null : v })}
          >
            <SelectTrigger id="application-group" className={triggerCls}>
              <SelectValue placeholder="不限" />
            </SelectTrigger>
            <SelectContent className={contentCls}>
              <SelectItem value={APPLICATION_GROUP_ALL} className={itemCls}>不限</SelectItem>
              {applicationGroups.map(g => (
                <SelectItem key={g} value={g} className={itemCls}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPA */}
        <div>
          <Label htmlFor="gpa" className={labelCls}>GPA</Label>
          <Input
            id="gpa" type="number" min={0} max={4.3} step={0.01}
            value={user.gpa ?? ''}
            onChange={(e) => setUser({ ...user, gpa: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="例如: 3.8"
            className={inputCls}
          />
          <p className={`mt-1 ${mutedCls}`}>滿分 4.3</p>
        </div>

        {/* 語言成績 */}
        <div className="space-y-3">
          <Label className={sectionLabelCls}>語言成績</Label>

          <div>
            <Label htmlFor="toefl" className={labelCls}>TOEFL iBT</Label>
            <Input
              id="toefl" type="number" min={0} max={120}
              value={user.toefl ?? ''}
              onChange={(e) => setUser({ ...user, toefl: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 90"
              className={inputCls}
            />
          </div>

          <div>
            <Label htmlFor="ielts" className={labelCls}>IELTS</Label>
            <Input
              id="ielts" type="number" min={0} max={9} step={0.5}
              value={user.ielts ?? ''}
              onChange={(e) => setUser({ ...user, ielts: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="例如: 7.0"
              className={inputCls}
            />
          </div>

          <div>
            <Label htmlFor="toeic" className={labelCls}>TOEIC</Label>
            <Input
              id="toeic" type="number" min={0} max={990}
              value={user.toeic ?? ''}
              onChange={(e) => setUser({ ...user, toeic: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 850"
              className={inputCls}
            />
          </div>

          {/* 全民英檢 */}
          <div>
            <Label htmlFor="gept" className={labelCls}>全民英檢</Label>
            <Select
              value={user.gept || '__none__'}
              onValueChange={(v) => setUser({ ...user, gept: v === '__none__' ? null : v })}
            >
              <SelectTrigger id="gept" className={triggerCls}>
                <SelectValue placeholder="不限" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                <SelectItem value="__none__" className={itemCls}>不限</SelectItem>
                {geptLevels.map(l => (
                  <SelectItem key={l} value={l} className={itemCls}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CEFR */}
          <div>
            <Label htmlFor="cefr" className={labelCls}>CEFR</Label>
            <Select
              value={user.cefr || '__none__'}
              onValueChange={(v) => setUser({ ...user, cefr: v === '__none__' ? null : v })}
            >
              <SelectTrigger id="cefr" className={triggerCls}>
                <SelectValue placeholder="不限" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                <SelectItem value="__none__" className={itemCls}>不限</SelectItem>
                {cefrLevels.map(l => (
                  <SelectItem key={l} value={l} className={itemCls}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* JLPT */}
          <div>
            <Label htmlFor="jlpt" className={labelCls}>JLPT 日語能力</Label>
            <Select
              value={user.jlpt || '__none__'}
              onValueChange={(v) => setUser({ ...user, jlpt: v === '__none__' ? null : v })}
            >
              <SelectTrigger id="jlpt" className={triggerCls}>
                <SelectValue placeholder="不限" />
              </SelectTrigger>
              <SelectContent className={contentCls}>
                <SelectItem value="__none__" className={itemCls}>不限</SelectItem>
                {jlptLevels.map(l => (
                  <SelectItem key={l} value={l} className={itemCls}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 其他條件 */}
        <div>
          <Label className={sectionLabelCls}>其他條件</Label>
          <div className="flex flex-wrap gap-3 mt-3">
            <Button
              variant={user.noFail ? 'default' : 'outline'}
              size="sm"
              className={
                variant === 'wishlist'
                  ? `text-sm font-normal transition-all duration-200 ${
                      user.noFail
                        ? 'bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] hover:text-[#3b2a1c]'
                        : 'bg-white border border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                    }`
                  : `text-sm font-normal transition-all duration-300 ${
                      user.noFail
                        ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg'
                        : isHighZoom
                          ? 'bg-white/20 hover:bg-white/30 text-gray-800 border-white/30 backdrop-blur-sm'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                    }`
              }
              onClick={() => setUser({ ...user, noFail: !user.noFail })}
            >
              我曾有不及格科目
            </Button>
            <Button
              variant={filters.hasQuota ? 'default' : 'outline'}
              size="sm"
              className={
                variant === 'wishlist'
                  ? `text-sm font-normal transition-all duration-200 ${
                      filters.hasQuota
                        ? 'bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] hover:text-[#3b2a1c]'
                        : 'bg-white border border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                    }`
                  : `text-sm font-normal transition-all duration-300 ${
                      filters.hasQuota
                        ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg'
                        : isHighZoom
                          ? 'bg-white/20 hover:bg-white/30 text-gray-800 border-white/30 backdrop-blur-sm'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                    }`
              }
              onClick={() => updateFilters({ hasQuota: !filters.hasQuota })}
            >
              排除資料已更新且無名額的學校
            </Button>
          </div>
        </div>

      </div>{/* end scrollable */}

      {/* 分隔線（獨立包裝確保上下間距） */}
      <div className="py-4 flex-shrink-0">
        <div className={`border-t transition-all duration-300 ${
          variant === 'wishlist' ? 'border-[#d6c3a1]' : (isHighZoom ? 'border-gray-300' : 'border-white/20')
        }`} />
      </div>

      {/* 操作按鈕（固定在下方） */}
      <div className="flex gap-2 flex-shrink-0">
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
                    ? 'bg-white/20 border-white/30 text-gray-800 hover:bg-white/30'
                    : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                }`
          }
          onClick={handleClearFilter}
          disabled={isSaving}
        >
          <X className="w-4 h-4 mr-2" />
          清除資格篩選
        </Button>
      </div>
      {!session && (
        <p className={`text-xs text-center mt-2 flex-shrink-0 ${mutedCls}`}>
          登入後可保存資格設定
        </p>
      )}
    </div>
  );
}
