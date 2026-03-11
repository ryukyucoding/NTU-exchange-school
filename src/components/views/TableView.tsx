'use client';

import { SchoolWithMatch } from '@/types/school';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, ArrowUpDown, Info } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useState } from 'react';
import SchoolDetailModal from '@/components/school-display/SchoolDetailModal';

type SortField = 'name' | 'country' | 'gpa_min' | 'quota';
type SortOrder = 'asc' | 'desc';

interface TableViewProps {
  schools: SchoolWithMatch[];
}

export default function TableView({ schools }: TableViewProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithMatch | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedSchools = [...schools].sort((a, b) => {
    let aValue: string | number | null;
    let bValue: string | number | null;

    switch (sortField) {
      case 'name':
        aValue = a.name_zh;
        bValue = b.name_zh;
        break;
      case 'country':
        aValue = a.country;
        bValue = b.country;
        break;
      case 'gpa_min':
        aValue = a.gpa_min;
        bValue = b.gpa_min;
        break;
      case 'quota':
        aValue = a.quota;
        bValue = b.quota;
        break;
      default:
        return 0;
    }

    if (aValue === null) return 1;
    if (bValue === null) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  if (schools.length === 0) {
    return (
      <div className="bg-white border border-dashed border-[#d6c3a1] rounded-xl p-12 text-center shadow-sm">
        <p className="text-[#6b5b4c] text-lg">沒有符合條件的學校</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white border border-[#d6c3a1] rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#d6c3a1] bg-[#f9f3ea] hover:bg-[#f9f3ea]">
              <TableHead className="w-[50px] text-[#6b5b4c] text-center">收藏</TableHead>
              <TableHead className="w-[200px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="hover:bg-[#f5ede1] text-[#6b5b4c] hover:text-[#4a3828]"
                >
                  學校名稱
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('country')}
                  className="hover:bg-[#f5ede1] text-[#6b5b4c] hover:text-[#4a3828]"
                >
                  國家
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[80px] text-[#6b5b4c] text-center">地區</TableHead>
              <TableHead className="w-[100px] text-[#6b5b4c] text-center">申請組別</TableHead>
              <TableHead className="w-[120px] text-[#6b5b4c] text-center">年級限制</TableHead>
              <TableHead className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('gpa_min')}
                  className="hover:bg-[#f5ede1] text-[#6b5b4c] hover:text-[#4a3828]"
                >
                  GPA 要求
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[150px] text-[#6b5b4c] text-center">學院限制</TableHead>
              <TableHead className="w-[120px] text-[#6b5b4c] text-center">語言要求</TableHead>
              <TableHead className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('quota')}
                  className="hover:bg-[#f5ede1] text-[#6b5b4c] hover:text-[#4a3828]"
                >
                  名額
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-[#6b5b4c] text-center">詳細資料</TableHead>
              <TableHead className="w-[70px] text-[#6b5b4c] text-center">OIA官網</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSchools.map(school => {
              const inWishlist = isInWishlist(school.id);

              return (
                <TableRow
                  key={school.id}
                  className="border-[#e8ddc8] hover:bg-[#f5ede1] transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSchool(school)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedSchool(school);
                    }
                  }}
                >
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (inWishlist) {
                          removeFromWishlist(school.id);
                        } else {
                          addToWishlist(school);
                        }
                      }}
                      className="bg-transparent text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]"
                    >
                      <Heart
                        className={`w-4 h-4 ${inWishlist ? 'fill-current text-[#8D7051]' : 'text-[#8a7a63]'}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    <div>
                      <div className="text-[#4a3828] font-semibold">{school.name_zh}</div>
                      <div className="text-xs text-[#6b5b4c]">{school.name_en}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[#4a3828] text-center">{school.country}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-[#d6c3a1] text-[#6b5b4c] bg-white">
                      {school.region === 'Americas' ? '美洲' : 
                       school.region === 'Europe' ? '歐洲' :
                       school.region === 'Asia' ? '亞洲' :
                       school.region === 'Oceania' ? '大洋洲' : school.region}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-[#6b5b4c]">
                      {school.language_group || '無限制'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-[#6b5b4c]">
                      {school.grade_requirement || '無限制'}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#4a3828] text-center">
                    {school.gpa_min ? `${school.gpa_min} 以上` : '無限制'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-[#6b5b4c]">
                      {(() => {
                        if (!school.restricted_colleges || school.restricted_colleges === '無' || school.restricted_colleges.trim() === '') {
                          return '無限制';
                        }
                        
                        const colleges = school.restricted_colleges.split(/[,，、]/).map(college => college.trim()).filter(college => college);
                        
                        if (colleges.length <= 3) {
                          return colleges.join(', ');
                        } else {
                          return colleges.slice(0, 3).join(', ') + '... 見詳細資料';
                        }
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-[#6b5b4c] whitespace-pre-line">
                      {(() => {
                        const requirements = [];
                        if (school.toefl_ibt) requirements.push(`TOEFL ${school.toefl_ibt}`);
                        if (school.ielts) requirements.push(`IELTS ${school.ielts}`);
                        if (school.toeic) requirements.push(`TOEIC ${school.toeic}`);
                        if (school.gept) requirements.push(`英檢${school.gept}以上`);
                        if (school.language_cefr) requirements.push(`CEFR ${school.language_cefr}以上`);
                        if (school.jlpt) requirements.push(`JLPT ${school.jlpt}`);
                        return requirements.length > 0 ? requirements.join('\n') : '無限制';
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#4a3828] text-center">
                    {(() => {
                      const q = school.quota || '';
                      if (!q) return '—';
                      const cleaned = q
                        .replace(/（[^）]*）/g, '')               // 先去全形括號（含括號內的不平衡）
                        .replace(/\([^)]*\)/g, '')                // 再去半形括號
                        .replace(/因交換學生往來不平衡[^\n]*/g, '') // 剩餘不在括號內的不平衡句
                        .replace(/※[^\n]*/g, '')                  // ※ 後的備註
                        .replace(/。/g, '')
                        .replace(/\n+/g, ' ')
                        .trim();
                      if (!cleaned) return '—';
                      return cleaned.length > 10 ? cleaned.slice(0, 10) + '…' : cleaned;
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSchool(school);
                      }}
                      className="bg-transparent text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(school.url, '_blank');
                      }}
                      className="bg-transparent text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

    </div>

    <SchoolDetailModal
      school={selectedSchool}
      open={!!selectedSchool}
      onClose={() => setSelectedSchool(null)}
      variant="wishlist"
    />
    </>
  );
}
