'use client';

import React, { useMemo, useState } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Plus, Minus, GripVertical, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import RouteGuard from '@/components/auth/RouteGuard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function WishlistContent() {
  const { wishlist, loading, removeFromWishlist, updateWishlistItem, getPreferences, reorderPreferences } = useWishlist();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ schoolId: string; note: string } | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [localWishlist, setLocalWishlist] = useState(wishlist);
  const isOptimisticUpdateRef = React.useRef(false);

  // 同步 wishlist 到本地状态（只在非乐观更新时同步）
  React.useEffect(() => {
    if (!isOptimisticUpdateRef.current) {
      setLocalWishlist(wishlist);
    } else {
      // 如果是乐观更新，延迟重置标志，确保 API 调用完成
      // 使用较长的延迟，确保所有异步操作都完成
      const timer = setTimeout(() => {
        isOptimisticUpdateRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [wishlist]);

  // 志愿序（order不为null的项目，按order排序）
  const preferences = useMemo(() => {
    return localWishlist
      .filter(item => item.order !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [localWishlist]);
  
  // 所有收藏（包括在志愿序中的）
  const allWishlist = useMemo(() => localWishlist, [localWishlist]);

  // 移除收藏 - 乐观更新
  const handleRemoveFromWishlist = async (schoolId: string) => {
    const item = localWishlist.find(w => w.school.id === schoolId);
    if (!item) return;

    // 乐观更新：立即从本地状态移除
    isOptimisticUpdateRef.current = true;
    const removedSchoolName = item.school.name_zh;
    setLocalWishlist(prev => prev.filter(w => w.school.id !== schoolId));

    // 直接调用 API，不通过 Context，避免触发刷新
    try {
      const response = await fetch(`/api/wishlist?schoolId=${schoolId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '移除失敗');
      }
      
      toast.success(`已移除 ${removedSchoolName}`);
      // API 成功后，保持标志为 true，避免同步覆盖我们的更新
    } catch (error) {
      // 如果失败，回滚
      isOptimisticUpdateRef.current = false;
      setLocalWishlist(wishlist);
      toast.error('移除失敗，請重試');
    }
  };

  // 切换志愿序（加入/移出）- 乐观更新
  const togglePreference = async (schoolId: string) => {
    const item = localWishlist.find(w => w.school.id === schoolId);
    if (!item) return;

    // 乐观更新：先更新本地状态
    const newOrder = item.order !== null ? null : (preferences.length > 0 
      ? Math.max(...preferences.map(p => p.order || 0)) + 1
      : 1);
    
    isOptimisticUpdateRef.current = true;
    setLocalWishlist(prev => prev.map(w => 
      w.school.id === schoolId 
        ? { ...w, order: newOrder }
        : w
    ));

    // 直接调用 API，不通过 Context，避免触发刷新
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, order: newOrder }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '更新失敗');
      }
      // API 成功后，保持标志为 true，避免同步覆盖我们的更新
      // 标志会在 useEffect 中延迟重置
    } catch (error) {
      // 如果失败，回滚
      isOptimisticUpdateRef.current = false;
      setLocalWishlist(wishlist);
      toast.error('更新失敗，請重試');
    }
  };

  // 拖拽排序
  const handleDragStart = (schoolId: string, e: React.DragEvent) => {
    setDraggingId(schoolId);
    setDragOverId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', schoolId);
    // 重置乐观更新标志，确保拖拽开始时状态正确
    isOptimisticUpdateRef.current = false;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, overId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === overId) {
      setDragOverId(overId);
      return;
    }
    
    // 实时更新拖拽预览
    const currentPreferences = localWishlist
      .filter(item => item.order !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const fromIndex = currentPreferences.findIndex(p => p.school.id === draggingId);
    const toIndex = currentPreferences.findIndex(p => p.school.id === overId);
    
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      // 实时预览：更新本地状态显示拖拽后的位置
      const previewPreferences = [...currentPreferences];
      const [moved] = previewPreferences.splice(fromIndex, 1);
      previewPreferences.splice(toIndex, 0, moved);

      const newOrderMap = new Map(
        previewPreferences.map((item, index) => [item.school.id, index + 1])
      );

      isOptimisticUpdateRef.current = true;
      setLocalWishlist(prev => prev.map(w => 
        w.order !== null && newOrderMap.has(w.school.id)
          ? { ...w, order: newOrderMap.get(w.school.id) || null }
          : w
      ));
    }
    
    setDragOverId(overId);
  };

  const handleDragEnd = async () => {
    if (!draggingId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const currentPreferences = localWishlist
      .filter(item => item.order !== null)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const fromIndex = currentPreferences.findIndex(p => p.school.id === draggingId);
    const toIndex = dragOverId ? currentPreferences.findIndex(p => p.school.id === dragOverId) : fromIndex;
    
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    // 状态已经在 handleDragOver 中更新了，这里只需要调用 API
    const finalPreferences = [...currentPreferences];
    const [moved] = finalPreferences.splice(fromIndex, 1);
    finalPreferences.splice(toIndex, 0, moved);

    const updates = finalPreferences.map((item, index) => ({
      schoolId: item.school.id,
      order: index + 1,
    }));

    // 直接调用 API，不通过 Context，避免触发刷新
    try {
      const response = await fetch('/api/wishlist', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '更新順序失敗');
      }
      // API 成功后，标记不需要同步
      isOptimisticUpdateRef.current = true;
    } catch (error) {
      // 如果失败，回滚
      isOptimisticUpdateRef.current = false;
      setLocalWishlist(wishlist);
      toast.error('更新順序失敗，請重試');
    }

    setDraggingId(null);
    setDragOverId(null);
  };

  // 打开备注编辑对话框
  const openNoteDialog = (schoolId: string, currentNote: string) => {
    setEditingNote({ schoolId, note: currentNote });
    setNoteDialogOpen(true);
  };

  // 保存备注
  const saveNote = async () => {
    if (!editingNote) return;
    
    if (editingNote.note.length > 100) {
      toast.error('备注最多100字符');
      return;
    }

    await updateWishlistItem(editingNote.schoolId, { note: editingNote.note });
    setNoteDialogOpen(false);
    setEditingNote(null);
  };

  // 清空志愿序 - 乐观更新
  const clearPreferences = async () => {
    // 乐观更新：先更新本地状态
    const preferenceSchoolIds = preferences.map(p => p.school.id);
    isOptimisticUpdateRef.current = true;
    setLocalWishlist(prev => prev.map(w => 
      preferenceSchoolIds.includes(w.school.id)
        ? { ...w, order: null }
        : w
    ));

    // 直接调用 API，不通过 Context，避免触发刷新
    try {
      await Promise.all(
        preferences.map(async (item) => {
          const response = await fetch('/api/wishlist', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: item.school.id, order: null }),
          });
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || '更新失敗');
          }
        })
      );
      // API 成功后，标记不需要同步
      isOptimisticUpdateRef.current = true;
      toast.success('已清空志願序');
    } catch (error) {
      // 如果失败，回滚
      isOptimisticUpdateRef.current = false;
      setLocalWishlist(wishlist);
      toast.error('清空失敗，請重試');
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-[#F4F4F4] overflow-hidden">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] overflow-hidden">
      <div className="max-w-6xl mx-auto h-full px-6 py-6 flex flex-col gap-4">
        <header className="flex flex-col gap-2 flex-shrink-0">
          <h1 className="text-3xl font-bold" style={{ color: '#333333' }}>收藏學校</h1>
          <p style={{ color: '#333333' }}>管理收藏清單，並在右側排定志願序（上限 30 間）。</p>
        </header>

        {allWishlist.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white border border-dashed border-[#d6c3a1] rounded-xl p-12 text-center shadow-sm w-full">
              <p style={{ color: '#333333' }}>目前沒有收藏的學校，回到地圖或表格頁面按愛心即可收藏。</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden min-h-0">
            {/* 左側：收藏清單（可獨立滾動） */}
            <div className="lg:col-span-2 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1">
                {allWishlist.map((item, idx) => {
                  const inPreference = item.order !== null;
                return (
                  <Card key={item.school.id} className="border-[#d6c3a1] bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-3">
                          <div className="min-w-[240px] max-w-[420px] flex-1">
                          <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold" style={{ color: '#333333' }}>{item.school.name_zh}</h3>
                            </div>
                            <p className="text-sm" style={{ color: '#333333' }}>{item.school.name_en}</p>
                            <div className="mt-2 flex gap-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="bg-[#f5ede1] pointer-events-none cursor-default select-none"
                                style={{ color: '#333333', borderColor: '#d6c3a1' }}
                              >
                                {item.school.country}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="pointer-events-none cursor-default select-none"
                                style={{ borderColor: '#d6c3a1', color: '#333333' }}
                              >
                                {item.school.region}
                              </Badge>
                              {item.school.gpa_min && (
                                <Badge
                                  variant="outline"
                                  className="pointer-events-none cursor-default select-none"
                                  style={{ borderColor: '#d6c3a1', color: '#333333' }}
                                >
                                  GPA {item.school.gpa_min}
                                </Badge>
                              )}
                            </div>
                            {item.note && (
                              <div className="mt-2 text-sm" style={{ color: '#666666' }}>
                                {item.note}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => togglePreference(item.school.id)}
                              className={inPreference 
                                ? "border-[#d6c3a1] bg-[#f5ede1] text-[#333333] hover:bg-[#e8ddc8]"
                                : "border-[#BAC7E5] bg-[#BAC7E5] text-white hover:bg-[#E8F0FE] hover:text-[#333333]"
                              }
                              aria-label={inPreference ? '移出志願序' : '加入志願序'}
                            >
                              {inPreference ? (
                                <Minus className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRemoveFromWishlist(item.school.id)}
                              style={{
                                color: '#8D7051',
                                borderColor: '#8D7051',
                                backgroundColor: 'white',
                              }}
                              className="hover:bg-[#f5ede1]"
                              aria-label="移除收藏"
                            >
                              <Heart className="w-4 h-4 fill-current" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNoteDialog(item.school.id, item.note)}
                            style={{ color: '#666666' }}
                            className="text-xs hover:bg-[#f5ede1]"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            備註
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
                  </div>

            {/* 右側：志願序（可獨立滾動；清空在底部置中） */}
            <div className="min-h-0 flex flex-col">
              <div className="bg-white border border-[#d6c3a1] rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 flex-shrink-0">
                  <h2 className="text-lg font-semibold" style={{ color: '#333333' }}>志願序</h2>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 min-h-0">
                  {preferences.length === 0 ? (
                    <p className="text-sm" style={{ color: '#666666' }}>尚未選擇志願，請從左側點擊「+」加入志願。</p>
                ) : (
                  <div className="space-y-2">
                      {preferences.slice(0, 30).map((item, index) => {
                        const isDragging = draggingId === item.school.id;
                        const isOver = dragOverId === item.school.id;
                        const isHovered = hoveredId === item.school.id;
                  return (
                    <div
                            key={item.school.id}
                            className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                              isDragging
                                ? 'shadow-lg bg-white'
                                : isOver
                                ? 'bg-[#E8F0FE]'
                                : isHovered
                                ? 'bg-[#E8F0FE]'
                                : 'bg-white'
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(item.school.id, e)}
                      onDragOver={(e) => handleDragOver(e, item.school.id)}
                      onDragEnd={handleDragEnd}
                            onMouseEnter={() => setHoveredId(item.school.id)}
                            onMouseLeave={() => setHoveredId(null)}
                    >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 rounded-full bg-[#e8ddc8] flex items-center justify-center font-semibold" style={{ color: '#333333' }}>
                          {index + 1}
                        </div>
                              <div className="min-w-[130px] max-w-[440px] flex-1">
                                <div className="font-semibold" style={{ color: '#333333' }}>{item.school.name_zh}</div>
                                <div className="text-sm" style={{ color: '#333333' }}>{item.school.country}</div>
                        </div>
                      </div>
                            <div className={`flex items-center gap-1 transition-opacity ${isHovered || isDragging ? 'opacity-100' : 'opacity-0'}`}>
                        <div
                          className="cursor-grab active:cursor-grabbing p-2"
                          title="拖曳調整志願序"
                                style={{ color: '#666666' }}
                        >
                                <GripVertical className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                )}
                </div>

                {preferences.length > 0 && (
                  <div className="p-4 pt-2 flex justify-center flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearPreferences}
                      style={{
                        borderColor: '#a07a52',
                        color: '#333333',
                        backgroundColor: 'white',
                      }}
                      className="hover:bg-[#f5ede1]"
                    >
                      清空
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 备注编辑对话框 */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-md bg-white border border-[#d6c3a1]">
          <DialogHeader>
            <DialogTitle style={{ color: '#333333' }}>編輯備註</DialogTitle>
            <DialogDescription style={{ color: '#666666' }}>
              最多100字符
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              value={editingNote?.note || ''}
              onChange={(e) => {
                if (editingNote) {
                  setEditingNote({ ...editingNote, note: e.target.value });
                }
              }}
              className="w-full min-h-[100px] rounded-md border border-[#d6c3a1] px-3 py-2 text-sm"
              style={{ color: '#333333' }}
              maxLength={100}
              placeholder="輸入備註..."
            />
            <div className="text-xs text-right" style={{ color: '#666666' }}>
              {(editingNote?.note.length || 0)} / 100
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setNoteDialogOpen(false);
                  setEditingNote(null);
                }}
                style={{
                  backgroundColor: '#f7efe5',
                  color: '#8D7051',
                  borderColor: '#d6c3a1',
                }}
              >
                取消
              </Button>
              <Button
                onClick={saveNote}
                style={{ backgroundColor: '#8D7051', color: 'white' }}
              >
                儲存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WishlistPage() {
  return (
    <RouteGuard>
      <WishlistContent />
    </RouteGuard>
  );
}
