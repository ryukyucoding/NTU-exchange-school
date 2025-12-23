'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function DeletePostDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: DeletePostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle style={{ color: '#5A5A5A' }}>刪除貼文</DialogTitle>
          <DialogDescription style={{ color: '#5A5A5A' }}>
            確定要刪除這篇貼文嗎？此操作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 justify-start items-start sm:items-center">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            style={{
              backgroundColor: '#BAC7E5',
              color: '#5A5A5A',
              borderRadius: '9999px',
            }}
            className="hover:bg-[#BAC7E5]/90 w-full sm:w-auto order-1"
          >
            取消
          </Button>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              borderColor: '#ef4444',
              color: '#ef4444',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
            }}
            className="hover:bg-gray-50 w-full sm:w-auto order-2"
          >
            {isDeleting ? '刪除中...' : '確定刪除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

