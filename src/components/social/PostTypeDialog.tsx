'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PostTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostTypeDialog({ open, onOpenChange }: PostTypeDialogProps) {
  const router = useRouter();

  const handleSelectType = async (type: 'general' | 'review') => {
    const path = type === 'general' ? '/social/post/general' : '/social/post/review';
    // 先關閉對話框
    onOpenChange(false);
    // 等待一個 tick 確保對話框關閉動畫完成，然後導航
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white [&>button]:text-[#5A5A5A] [&>button>svg]:text-[#5A5A5A]">
        <DialogHeader>
          <DialogTitle className="text-[#5A5A5A]">選擇發文類型</DialogTitle>
          <DialogDescription>
            請選擇您要發佈的貼文類型
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelectType('general');
            }}
            className="w-full py-6 text-lg bg-transparent border border-[#8D7051] text-[#8D7051] hover:bg-transparent hover:opacity-80"
          >
            我有話要說
          </Button>
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelectType('review');
            }}
            className="w-full py-6 text-lg bg-transparent border border-[#8D7051] text-[#8D7051] hover:bg-transparent hover:opacity-80"
          >
            學校心得文
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

