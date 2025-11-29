import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function WelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenWelcome', 'true');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            歡迎使用 NTU 交換學校申請系統！
          </DialogTitle>
          <DialogDescription>
            讓我們快速了解如何使用這個系統
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">設定你的資格</h4>
              <p className="text-sm text-gray-600">
                在左側篩選面板輸入你的 GPA、語言成績、學院等資訊，系統會自動篩選符合條件的學校
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">瀏覽與篩選學校</h4>
              <p className="text-sm text-gray-600">
                使用多種篩選條件找到適合的學校，可以在表格、地圖兩種模式間切換
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">收藏與確認志願</h4>
              <p className="text-sm text-gray-600">
                點擊愛心圖示將學校加入收藏清單，可以加上個人備註，並排序志願優先順序，系統會幫你產生申請準備計畫
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-800">
              <strong>提醒：</strong>此系統僅供參考，實際申請仍須依照 NTU OIA 官方規定進行
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label htmlFor="dontShow" className="text-sm cursor-pointer">
              不再顯示此訊息
            </Label>
          </div>
          <Button onClick={handleClose}>開始使用</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
