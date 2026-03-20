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

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onSaveDraft: () => void;
  isSavingDraft?: boolean;
  isEditMode?: boolean;
  onUpdate?: () => void;
  isUpdating?: boolean;
}

export default function UnsavedChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  onSaveDraft,
  isSavingDraft = false,
  isEditMode = false,
  onUpdate,
  isUpdating = false,
}: UnsavedChangesDialogProps) {
  const isLoading = isSavingDraft || isUpdating;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92%] sm:max-w-[425px] rounded-lg bg-white">
        <DialogHeader>
          <DialogTitle style={{ color: '#5A5A5A' }}>捨棄變更？</DialogTitle>
          <DialogDescription style={{ color: '#5A5A5A' }}>
            您有未儲存的變更，確定要離開嗎？{isEditMode ? '您可以選擇更新貼文或直接捨棄變更。' : '您可以選擇儲存為草稿或直接捨棄變更。'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-row flex-wrap gap-2 justify-end items-center">
          <Button
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            style={{
              backgroundColor: '#BAC7E5',
              color: '#5A5A5A',
              borderRadius: '9999px',
            }}
            className="hover:bg-[#BAC7E5]/90 order-1"
          >
            取消
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isLoading}
            style={{
              borderColor: '#ef4444',
              color: '#ef4444',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
            }}
            className="hover:bg-gray-50 order-2"
          >
            捨棄變更
          </Button>
          {isEditMode && onUpdate ? (
            <Button
              variant="outline"
              onClick={onUpdate}
              disabled={isLoading}
              style={{
                borderColor: '#5A5A5A',
                color: '#5A5A5A',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
              }}
              className="hover:bg-gray-50 order-3"
            >
              {isUpdating ? '更新中...' : '更新貼文'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={isLoading}
              style={{
                borderColor: '#5A5A5A',
                color: '#5A5A5A',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
              }}
              className="hover:bg-gray-50 order-3"
            >
              {isSavingDraft ? '儲存中...' : '儲存草稿'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

