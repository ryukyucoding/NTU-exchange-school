'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Star, Trash2, MapPin, ArrowUp, ArrowDown, FileCheck, Download, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import ApplicationForm from '@/components/application/ApplicationForm';
import toast from 'react-hot-toast';

export default function WishlistPanel() {
  const { wishlist, removeFromWishlist, updateWishlistItem, reorderWishlist, clearWishlist } = useWishlist();
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [submittedApplication, setSubmittedApplication] = useState<any>(null);

  useEffect(() => {
    // 檢查是否有已提交的申請（只在客戶端）
    if (typeof window !== 'undefined') {
      const savedApplication = localStorage.getItem('applicationPreferences');
      if (savedApplication) {
        try {
          setSubmittedApplication(JSON.parse(savedApplication));
        } catch (error) {
          console.error('Failed to parse application preferences:', error);
        }
      }
    }
  }, []);

  const handleExport = () => {
    if (!submittedApplication) return;

    const selectedSchools = submittedApplication.preferences
      .map((id: string) => wishlist.find(item => item.school.id === id))
      .filter(Boolean);

    let content = '='.repeat(60) + '\n';
    content += '台大交換學生申請計畫\n';
    content += '='.repeat(60) + '\n\n';
    content += `產生日期: ${new Date().toLocaleDateString('zh-TW')}\n`;
    content += `提交時間: ${new Date(submittedApplication.submittedAt).toLocaleString('zh-TW')}\n\n`;

    content += '📋 申請志願序\n';
    content += '-'.repeat(60) + '\n';
    selectedSchools.forEach((item: any, index: number) => {
      content += `\n第 ${index + 1} 志願: ${item.school.name_zh} (${item.school.name_en})\n`;
      content += `  國家/地區: ${item.school.country} (${item.school.region})\n`;
      if (item.school.gpa_min) {
        content += `  GPA 要求: ${item.school.gpa_min}\n`;
      }
      if (item.school.toefl_ibt || item.school.ielts || item.school.toeic) {
        content += `  語言要求: `;
        if (item.school.toefl_ibt) content += `TOEFL ${item.school.toefl_ibt} `;
        if (item.school.ielts) content += `IELTS ${item.school.ielts} `;
        if (item.school.toeic) content += `TOEIC ${item.school.toeic}`;
        content += '\n';
      }
      content += `  名額: ${item.school.quota}\n`;
      content += `  開放學期: ${item.school.semesters.join(', ')}\n`;
      content += `  官網: ${item.school.url}\n`;
      if (item.note) {
        content += `  個人備註: ${item.note}\n`;
      }
    });

    content += '\n\n📝 準備事項檢查清單\n';
    content += '-'.repeat(60) + '\n';
    content += '□ 確認各校申請截止日期\n';
    content += '□ 準備英文成績證明\n';
    content += '□ 準備中英文成績單\n';
    content += '□ 撰寫讀書計畫 (Study Plan)\n';
    content += '□ 撰寫自傳 (Personal Statement)\n';
    content += '□ 準備推薦信\n';
    content += '□ 確認護照效期\n';
    content += '□ 了解簽證申請流程\n';
    content += '□ 研究住宿選項\n';

    content += '\n\n💡 重要提醒\n';
    content += '-'.repeat(60) + '\n';
    content += '1. 請密切注意 OIA 網站公告的申請時程\n';
    content += '2. 各校可能有特殊申請條件，請詳閱申請資料\n';
    content += '3. 建議提早準備語言檢定，以免錯過申請期限\n';
    content += '4. 可以參考學長姐的交換心得，了解當地生活\n';
    content += '5. 記得參加 OIA 舉辦的交換說明會\n';

    content += '\n\n' + '='.repeat(60) + '\n';
    content += '祝你申請順利！\n';
    content += '='.repeat(60) + '\n';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NTU交換申請計畫_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已匯出申請計畫');
  };

  const handleResetApplication = () => {
    if (confirm('確定要重新開始申請流程嗎？這將清除您目前已送出的志願。')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('applicationPreferences');
      }
      setSubmittedApplication(null);
      toast.success('已重置申請狀態');
    }
  };

  const toggleNote = (schoolId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(schoolId)) {
      newExpanded.delete(schoolId);
    } else {
      newExpanded.add(schoolId);
    }
    setExpandedNotes(newExpanded);
  };

  // 如果已經送出志願，顯示已送出的狀態
  if (submittedApplication) {
    const selectedSchools = submittedApplication.preferences
      .map((id: string) => wishlist.find(item => item.school.id === id))
      .filter(Boolean);

    return (
      <div className="space-y-4">
        <div className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl rounded-lg p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-3" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">您已送出志願！</h3>
            <p className="text-gray-600">
              提交時間: {new Date(submittedApplication.submittedAt).toLocaleString('zh-TW')}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-800">您的志願序：</h4>
            {selectedSchools.map((item: any, index: number) => (
              <div
                key={item.school.id}
                className="flex items-center gap-3 p-3 bg-white/40 rounded-lg"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{item.school.name_zh}</div>
                  <div className="text-sm text-gray-600">{item.school.country}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleExport}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              下載申請計畫
            </Button>
            <Button
              variant="outline"
              onClick={handleResetApplication}
              className="w-full bg-white/50 text-gray-800 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
            >
              重新開始申請
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="bg-white/30 backdrop-blur-md border border-white/40 shadow-xl rounded-lg p-8 text-center">
        <p className="text-gray-700 drop-shadow-sm">
          尚無收藏學校<br />
          點擊學校卡片的愛心圖示來加入收藏
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* 滾動區域 - 卡片式布局 */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {wishlist.map((item, index) => (
            <div
              key={item.school.id}
              className="bg-white/30 backdrop-blur-md border border-white/40 hover:border-white/60 transition-all duration-200 hover:shadow-lg rounded-lg p-4"
            >
              {/* 學校標題與操作按鈕 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-yellow-200">#{index + 1}</span>
                    <h3 className="font-bold text-gray-800 text-lg">{item.school.name_zh}</h3>
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{item.school.name_en}</p>
                </div>

                {/* 右上角操作按鈕 */}
                <div className="flex gap-1">
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => reorderWishlist(index, index - 1)}
                      className="h-8 w-8 hover:bg-white/30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                  )}
                  {index < wishlist.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => reorderWishlist(index, index + 1)}
                      className="h-8 w-8 hover:bg-white/30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromWishlist(item.school.id)}
                    className="h-8 w-8 text-gray-600 hover:text-gray-800 hover:bg-white/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 學校資訊標籤 */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className="bg-transparent hover:bg-slate-100/80 text-slate-700 border-slate-300 transition-colors">
                  <MapPin className="w-3 h-3 mr-1" />
                  {item.school.country}
                </Badge>
              </div>

              {/* 優先順序星星 */}
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/30">
                <span className="text-sm font-medium text-gray-700">優先順序:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => updateWishlistItem(item.school.id, { priority: star })}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          star <= item.priority
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 備註區域 */}
              <div>
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => toggleNote(item.school.id)}
                >
                  <span className="text-sm font-medium text-gray-700">備註</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-white/30"
                  >
                    {expandedNotes.has(item.school.id) ? '收合' : '展開'}
                  </Button>
                </div>
                {expandedNotes.has(item.school.id) && (
                  <Textarea
                    placeholder="個人備註 (如學長姐心得、特殊考量等)"
                    value={item.note}
                    onChange={(e) => updateWishlistItem(item.school.id, { note: e.target.value })}
                    rows={3}
                    className="text-sm bg-white/50 backdrop-blur-sm border-white/40 focus:border-amber-300 text-gray-800"
                  />
                )}
                {!expandedNotes.has(item.school.id) && item.note && (
                  <p className="text-sm text-gray-700 line-clamp-2 bg-white/20 p-2 rounded">
                    {item.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 操作按鈕 - 固定在底部 */}
        <div className="flex gap-2">
          {wishlist.length > 0 && (
            <Button
              onClick={() => setShowApplicationForm(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <FileCheck className="w-4 h-4 mr-2" />
              確認志願序 ({wishlist.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={clearWishlist}
            className="bg-white/50 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
          >
            清空
          </Button>
        </div>
      </div>

      <ApplicationForm
        open={showApplicationForm}
        onClose={() => setShowApplicationForm(false)}
      />
    </>
  );
}
