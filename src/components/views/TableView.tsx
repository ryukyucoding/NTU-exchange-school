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
    let aValue: any;
    let bValue: any;

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

    if (typeof aValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  if (schools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/70 text-lg">沒有符合條件的學校</p>
      </div>
    );
  }

  return (
    <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/20">
              <TableHead className="w-[50px] text-white/70 text-center">收藏</TableHead>
              <TableHead className="w-[200px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="hover:bg-white/20 text-white/70 hover:text-white"
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
                  className="hover:bg-white/20 text-white/70 hover:text-white"
                >
                  國家
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[60px] text-white/70 text-center">地區</TableHead>
              <TableHead className="w-[100px] text-white/70 text-center">申請組別</TableHead>
              <TableHead className="w-[120px] text-white/70 text-center">年級限制</TableHead>
              <TableHead className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('gpa_min')}
                  className="hover:bg-white/20 text-white/70 hover:text-white"
                >
                  GPA 要求
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[150px] text-white/70 text-center">學院限制</TableHead>
              <TableHead className="w-[120px] text-white/70 text-center">語言要求</TableHead>
              <TableHead className="w-[80px] text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('quota')}
                  className="hover:bg-white/20 text-white/70 hover:text-white"
                >
                  名額
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[70px] text-white/70 text-center">詳細資料</TableHead>
              <TableHead className="w-[70px] text-white/70 text-center">OIA官網</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSchools.map(school => {
              const inWishlist = isInWishlist(school.id);

              return (
                <TableRow key={school.id} className="border-white/20 hover:bg-white/10 transition-colors">
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (inWishlist) {
                          removeFromWishlist(school.id);
                        } else {
                          addToWishlist(school);
                        }
                      }}
                      className="hover:bg-white/20"
                    >
                      <Heart
                        className={`w-4 h-4 ${inWishlist ? 'fill-current text-red-400' : 'text-white/70'}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium text-center">
                    <div>
                      <div className="text-white font-semibold">{school.name_zh}</div>
                      <div className="text-xs text-white/70">{school.name_en}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-center">{school.country}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-white/70 border-white/30">
                      {school.region === 'Americas' ? '美洲' : 
                       school.region === 'Europe' ? '歐洲' :
                       school.region === 'Asia' ? '亞洲' :
                       school.region === 'Oceania' ? '大洋洲' : school.region}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-white/70">
                      {school.application_group || '無限制'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-white/70">
                      {school.grade_requirement || '無限制'}
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-center">
                    {school.gpa_min ? `${school.gpa_min} 以上` : '無限制'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-xs text-white/70">
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
                    <div className="text-xs text-white/70 whitespace-pre-line">
                      {(() => {
                        const requirements = [];
                        if (school.toefl_ibt) requirements.push(`TOEFL ${school.toefl_ibt}`);
                        if (school.ielts) requirements.push(`IELTS ${school.ielts}`);
                        if (school.toeic) requirements.push(`TOEIC ${school.toeic}`);
                        return requirements.length > 0 ? requirements.join('\n') : '無限制';
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-white text-center">{school.quota || '未提供'}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSchool(school)}
                      className="hover:bg-white/20 text-white/70 hover:text-white"
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(school.url, '_blank')}
                      className="hover:bg-white/20 text-white/70 hover:text-white"
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

      <SchoolDetailModal
        school={selectedSchool}
        open={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
      />
    </div>
  );
}
