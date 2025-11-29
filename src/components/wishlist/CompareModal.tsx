import { SchoolWithMatch } from '@/types/school';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Minus } from 'lucide-react';

interface CompareModalProps {
  schools: SchoolWithMatch[];
  open: boolean;
  onClose: () => void;
}

export default function CompareModal({ schools, open, onClose }: CompareModalProps) {
  if (schools.length === 0) return null;

  const CompareIcon = ({ value }: { value: boolean | null }) => {
    if (value === true) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (value === false) return <XCircle className="w-5 h-5 text-red-500" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>比較學校 ({schools.length})</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 bg-gray-50 sticky left-0">項目</th>
                {schools.map(school => (
                  <th key={school.id} className="p-3 min-w-[200px]">
                    <div className="font-semibold">{school.name_zh}</div>
                    <div className="text-xs text-gray-600 font-normal">
                      {school.name_en}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">國家/地區</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3">
                    <div>{school.country}</div>
                    <div className="text-xs text-gray-600">{school.region}</div>
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">GPA 要求</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3 text-center">
                    {school.gpa_min ? school.gpa_min.toFixed(2) : '-'}
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">TOEFL iBT</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3 text-center">
                    {school.toefl_ibt || '-'}
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">IELTS</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3 text-center">
                    {school.ielts || '-'}
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">名額</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3 text-center">
                    {school.quota} 名
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">開放學期</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3">
                    {school.semesters.join(', ')}
                  </td>
                ))}
              </tr>

              <tr className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium bg-gray-50 sticky left-0">學費</td>
                {schools.map(school => (
                  <td key={school.id} className="p-3 text-center">
                    {school.tuition || '-'}
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
