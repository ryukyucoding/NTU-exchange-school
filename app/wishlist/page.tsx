'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, HeartOff, PlusCircle, CheckCircle2, GripVertical, ArrowUpFromLine, ArrowDownFromLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { SchoolWithMatch } from '@/types/school';
import RouteGuard from '@/components/auth/RouteGuard';

function WishlistContent() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const [preferences, setPreferences] = useState<
    { id: string; school: SchoolWithMatch; addedAt: number }[]
  >([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 初始載入已儲存的志願序（若有）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('applicationPreferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.preferences)) {
          setPreferences(parsed.preferences);
        }
      } catch (err) {
        console.error('Failed to parse application preferences:', err);
      }
    }
    setLoaded(true);
  }, []);

  // 自動儲存志願序（持久化含學校快照）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!loaded) return; // 避免初次載入時覆寫既有資料
    localStorage.setItem(
      'applicationPreferences',
      JSON.stringify({
        preferences,
        submittedAt: Date.now(),
      })
    );
  }, [preferences, loaded]);

  const isSelected = (id: string) => preferences.some(p => p.id === id);

  const selectedItems = useMemo(() => preferences, [preferences]);

  const toggleSelect = (id: string) => {
    const existing = preferences.find(p => p.id === id);
    if (existing) {
      setPreferences(prev => prev.filter(p => p.id !== id));
      return;
    }

    const school = wishlist.find(item => item.school.id === id)?.school;
    if (!school) {
      toast.error('找不到該學校的資料，請先在收藏中保留該校再加入志願');
      return;
    }

    setPreferences(prev => {
      if (prev.length >= 30) {
        toast.error('志願上限為 30 間學校');
        return prev;
      }
      return [...prev, { id, school, addedAt: Date.now() }];
    });
  };

  const movePreference = (id: string, direction: 'up' | 'down') => {
    setPreferences(prev => {
      const next = [...prev];
      const index = next.findIndex(p => p.id === id);
      if (index === -1) return prev;
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= next.length) return prev;
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  };

  const moveToEdge = (id: string, to: 'top' | 'bottom') => {
    setPreferences(prev => {
      const next = prev.filter(p => p.id !== id);
      const target = prev.find(p => p.id === id);
      if (!target) return prev;
      if (to === 'top') {
        next.unshift(target);
      } else {
        next.push(target);
      }
      return next;
    });
  };

  const handleDragStart = (id: string, e: React.DragEvent) => {
    setDraggingId(id);
    setDragOverId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, overId: string) => {
    e.preventDefault();
    if (!draggingId || draggingId === overId) return;
    setDragOverId(overId);
    setPreferences(prev => {
      const next = [...prev];
      const from = next.findIndex(p => p.id === draggingId);
      const to = next.findIndex(p => p.id === overId);
      if (from === -1 || to === -1) return prev;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleRemove = (id: string) => {
    removeFromWishlist(id);
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-[#4a3828]">收藏學校</h1>
          <p className="text-[#6b5b4c]">管理收藏清單，並在右側排定志願序（上限 30 間）。</p>
        </header>

        {wishlist.length === 0 ? (
          <div className="bg-white border border-dashed border-[#d6c3a1] rounded-xl p-12 text-center shadow-sm">
            <p className="text-[#6b5b4c]">目前沒有收藏的學校，回到地圖或表格頁面按愛心即可收藏。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左側：收藏清單 */}
            <div className="lg:col-span-2 space-y-4">
              {wishlist.map((item, idx) => {
                const selected = isSelected(item.school.id);
                return (
                  <Card key={item.school.id} className="border-[#d6c3a1] bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-3">
                          <div className="min-w-[240px] max-w-[420px]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#8a7a63]">#{idx + 1}</span>
                            <h3 className="text-lg font-semibold text-[#4a3828]">{item.school.name_zh}</h3>
                          </div>
                          <p className="text-sm text-[#6b5b4c]">{item.school.name_en}</p>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-[#f5ede1] text-[#4a3828] border-[#d6c3a1]">{item.school.country}</Badge>
                            <Badge variant="outline" className="border-[#d6c3a1] text-[#6b5b4c]">{item.school.region}</Badge>
                            {item.school.gpa_min && <Badge variant="outline" className="border-[#d6c3a1] text-[#6b5b4c]">GPA {item.school.gpa_min}</Badge>}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => toggleSelect(item.school.id)}
                            className={
                              selected
                                ? 'bg-[#f5ede1] text-[#4a3828] border border-[#d6c3a1] hover:bg-[#e8ddc8]'
                                : 'bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f]'
                            }
                          >
                            <PlusCircle className="w-4 h-4 mr-2" />
                            {selected ? '移出志願' : '加入志願'}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemove(item.school.id)}
                            className="text-[#4a3828] border-[#a07a52] bg-white hover:bg-[#f5ede1]"
                          >
                            <HeartOff className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 右側：志願序 */}
            <div className="space-y-3">
              <div className="bg-white border border-[#d6c3a1] rounded-xl shadow-sm p-4 sticky top-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#4a3828]">志願序</h2>
                    <p className="text-sm text-[#6b5b4c]">選擇並調整志願順位，最多 30 間。</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreferences([])}
                    className="border-[#a07a52] text-[#4a3828] bg-white hover:bg-[#f5ede1]"
                  >
                    清空
                  </Button>
                </div>

                {selectedItems.length === 0 ? (
                  <p className="text-[#8a7a63] text-sm">尚未選擇志願，請從左側點擊「加入志願」。</p>
                ) : (
                  <div className="space-y-2">
                {selectedItems.slice(0, 30).map((item, index) => {
                  const isDragging = draggingId === item.id;
                  const isOver = dragOverId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between bg-[#f9f3ea] border border-[#d6c3a1] rounded-lg p-3 transition-shadow ${
                        isDragging ? 'shadow-lg border-[#b08968]' : isOver ? 'border-[#c5b28f]' : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(item.school.id, e)}
                      onDragOver={(e) => handleDragOver(e, item.school.id)}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDragEnd}
                    >
                        <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#e8ddc8] text-[#4a3828] flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <div className="min-w-[130px] max-w-[440px]">
                          <div className="font-semibold text-[#4a3828]">{item.school.name_zh}</div>
                          <div className="text-sm text-[#6b5b4c]">{item.school.country}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-grab active:cursor-grabbing p-2"
                          title="拖曳調整志願序"
                        >
                          <GripVertical className="w-4 h-4 text-[#6b5b4c]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
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

