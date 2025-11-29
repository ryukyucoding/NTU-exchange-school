import { useState } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { FileCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import ApplicationSummary from './ApplicationSummary';

interface ApplicationFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ApplicationForm({ open, onClose }: ApplicationFormProps) {
  const { wishlist } = useWishlist();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const handleToggleSelection = (schoolId: string) => {
    if (selectedIds.includes(schoolId)) {
      setSelectedIds(selectedIds.filter(id => id !== schoolId));
    } else {
      if (selectedIds.length >= 5) {
        toast.error('最多只能選擇 5 個志願');
        return;
      }
      setSelectedIds([...selectedIds, schoolId]);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedIds.length === 0) {
      toast.error('請至少選擇一間學校');
      return;
    }
    // 將選中的學校依照 wishlist 順序排列
    const orderedPreferences = wishlist
      .filter(item => selectedIds.includes(item.school.id))
      .map(item => item.school.id);

    setPreferences(orderedPreferences);
    setShowSummary(true);
  };

  if (showSummary) {
    return (
      <ApplicationSummary
        preferences={preferences}
        wishlist={wishlist}
        open={open}
        onClose={() => {
          setShowSummary(false);
          setSelectedIds([]);
          setPreferences([]);
          onClose();
        }}
        onBack={() => setShowSummary(false)}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">確認申請志願與順序</DialogTitle>
          <DialogDescription>
            從收藏清單中選擇 1-5 間學校作為申請志願（依照目前收藏順序）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {wishlist.length === 0 ? (
            <div className="text-center py-8 text-white">
              收藏清單是空的，請先加入想申請的學校
            </div>
          ) : (
            <>
              <div className="text-sm text-white">
                已選擇: {selectedIds.length} / 5
              </div>

              {wishlist.map((item, index) => {
                const isSelected = selectedIds.includes(item.school.id);

                return (
                  <Card
                    key={item.school.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 border-2' : ''
                    }`}
                    onClick={() => handleToggleSelection(item.school.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelection(item.school.id)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-lg text-white">
                                {index + 1}. {item.school.name_zh}
                              </h4>
                              <p className="text-sm text-gray-400">{item.school.name_en}</p>
                            </div>
                          </div>

                          <div className="mt-2 flex gap-2 flex-wrap">
                            <Badge variant="secondary">{item.school.country}</Badge>
                            <Badge variant="secondary">{item.school.region}</Badge>
                            {item.school.gpa_min && (
                              <Badge variant="outline">GPA {item.school.gpa_min}</Badge>
                            )}
                            <Badge variant="outline">{item.school.quota} 名額</Badge>
                          </div>

                          {item.note && (
                            <div className="mt-2 text-sm text-gray-300 bg-gray-800 p-2 rounded">
                              備註: {item.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={selectedIds.length === 0}
          >
            <FileCheck className="w-4 h-4 mr-2" />
            確認 ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
