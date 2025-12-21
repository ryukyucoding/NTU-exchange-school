import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Download, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface WishlistItem {
  school: {
    id: string;
    name_zh: string;
    name_en: string;
    country: string;
  };
  priority: number;
  note: string;
  addedAt: string;
}

interface ApplicationSummaryProps {
  preferences: string[];
  wishlist: WishlistItem[];
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function ApplicationSummary({
  preferences,
  wishlist,
  open,
  onClose,
  onBack,
}: ApplicationSummaryProps) {
  const [submitted, setSubmitted] = useState(false);

  const selectedSchools = preferences
    .map(id => wishlist.find(item => item.school.id === id))
    .filter(Boolean) as WishlistItem[];

  const handleSubmit = () => {
    // 觸發慶祝動畫
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setSubmitted(true);
    toast.success('申請志願已確認！');

    // 儲存到 localStorage（只在客戶端）
    if (typeof window !== 'undefined') {
      localStorage.setItem('applicationPreferences', JSON.stringify({
        preferences,
        submittedAt: new Date().toISOString(),
      }));
    }
  };

  const handleExport = () => {
    const content = generateExportContent();
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

  const generateExportContent = () => {
    let content = '='.repeat(60) + '\n';
    content += '台大交換學生申請計畫\n';
    content += '='.repeat(60) + '\n\n';
    content += `產生日期: ${new Date().toLocaleDateString('zh-TW')}\n\n`;

    content += '📋 申請志願序\n';
    content += '-'.repeat(60) + '\n';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedSchools.forEach((item: any, index: number) => {
      const school = item.school;
      content += `\n第 ${index + 1} 志願: ${school.name_zh} (${school.name_en})\n`;
      content += `  國家/地區: ${school.country}\n`;
      if (school.gpa_min) {
        content += `  GPA 要求: ${school.gpa_min}\n`;
      }
      if (school.toefl_ibt || school.ielts || school.toeic) {
        content += `  語言要求: `;
        if (school.toefl_ibt) content += `TOEFL ${school.toefl_ibt} `;
        if (school.ielts) content += `IELTS ${school.ielts} `;
        if (school.toeic) content += `TOEIC ${school.toeic}`;
        content += '\n';
      }
      content += `  名額: ${school.quota}\n`;
      content += `  開放學期: ${school.semesters.join(', ')}\n`;
      content += `  官網: ${school.url}\n`;
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

    return content;
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <DialogTitle className="text-2xl text-center">
              您已送出志願！
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              您的申請計畫已經建立完成，請下載申請計畫以便後續準備
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">您的志願序</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedSchools.map((item, index) => (
                  <div
                    key={item.school.id}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{item.school.name_zh}</div>
                      <div className="text-sm text-gray-400">{item.school.country}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">下一步</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-300">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">✅</div>
                  <div>密切關注 OIA 網站公告的申請時程與相關資訊</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">✅</div>
                  <div>開始準備申請文件（成績單、讀書計畫、推薦信等）</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">✅</div>
                  <div>確認各校的語言成績要求，必要時安排檢定考試</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">✅</div>
                  <div>參考學長姐的交換心得，了解各校特色</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">✅</div>
                  <div>參加 OIA 舉辦的交換說明會</div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button onClick={handleExport} size="lg" className="w-full">
                <Download className="w-5 h-5 mr-2" />
                下載申請計畫
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="w-full">
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">確認志願順序</DialogTitle>
          <DialogDescription>
            請確認以下志願順序，確定後將無法修改
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>申請志願 ({selectedSchools.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedSchools.map((item, index) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const school = item.school as any;
                return (
                <div key={school.id}>
                  <div className="flex gap-4 p-4 bg-gray-800 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                        {index + 1}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="font-semibold text-lg text-white">{school.name_zh}</h4>
                        <p className="text-sm text-gray-400">{school.name_en}</p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{school.country}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {school.gpa_min && (
                          <div>
                            <span className="text-gray-400">GPA 要求: </span>
                            <span className="font-medium text-white">{school.gpa_min}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">名額: </span>
                          <span className="font-medium text-white">{school.quota}</span>
                        </div>
                        {(school.toefl_ibt || school.ielts || school.toeic) && (
                          <div className="col-span-2">
                            <span className="text-gray-400">語言要求: </span>
                            <span className="font-medium text-white">
                              {school.toefl_ibt && `TOEFL ${school.toefl_ibt}`}
                              {school.ielts && ` / IELTS ${school.ielts}`}
                              {school.toeic && ` / TOEIC ${school.toeic}`}
                            </span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-gray-400">開放學期: </span>
                          <span className="font-medium text-white">{school.semesters.join(', ')}</span>
                        </div>
                      </div>

                      {item.note && (
                        <div className="text-sm bg-yellow-900/30 p-2 rounded border border-yellow-700">
                          <span className="font-medium text-yellow-300">備註: </span>
                          <span className="text-gray-300">{item.note}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {index < selectedSchools.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-yellow-900/20 border-yellow-700">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-yellow-300">⚠️ 重要提醒</h4>
              <ul className="text-sm space-y-1 text-yellow-100">
                <li>• 志願順序一經確認後將無法在此系統中修改</li>
                <li>• 實際申請仍須依照 OIA 規定流程進行</li>
                <li>• 請確認各校申請資格與截止日期</li>
                <li>• 建議匯出申請計畫以便後續參考</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回修改
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            匯出計畫
          </Button>
          <Button onClick={handleSubmit}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            確認送出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
