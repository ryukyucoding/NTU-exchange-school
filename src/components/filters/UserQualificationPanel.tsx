import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserQualificationPanel() {
  const { user, setUser, resetUser } = useUserContext();

  const handleApplyFilter = () => {
    const hasAnyQualification =
      user.college !== null ||
      user.grade !== null ||
      user.gpa !== null ||
      user.toefl !== null ||
      user.ielts !== null ||
      user.toeic !== null;

    if (hasAnyQualification) {
      toast.success('已套用資格篩選');
    } else {
      toast('請先填寫至少一項資格', { icon: 'ℹ️' });
    }
  };

  const handleClearFilter = () => {
    resetUser();
    toast.success('已清除所有篩選條件');
  };

  const colleges = [
    '文學院', '理學院', '社會科學院', '醫學院', '工學院',
    '生農學院', '管理學院', '公衛學院', '電資學院', '法律學院', '生科學院'
  ];

  const grades = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

  return (
    <div className="w-full space-y-4">
        {/* 學院選擇 */}
        <div>
          <Label htmlFor="college" className="text-white font-medium">學院</Label>
          <Select
            value={user.college || ''}
            onValueChange={(value) => setUser({ ...user, college: value })}
          >
            <SelectTrigger id="college" className="bg-white/10 border-white/30 text-white data-[placeholder]:text-white/70">
              <SelectValue placeholder="請選擇學院" />
            </SelectTrigger>
            <SelectContent className="bg-white/20 backdrop-blur-md border-white/30">
              {colleges.map(college => (
                <SelectItem key={college} value={college} className="text-white hover:bg-white/20">
                  {college}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 年級選擇 */}
        <div>
          <Label htmlFor="grade" className="text-white font-medium">年級</Label>
          <Select
            value={user.grade || ''}
            onValueChange={(value: any) => setUser({ ...user, grade: value })}
          >
            <SelectTrigger id="grade" className="bg-white/10 border-white/30 text-white data-[placeholder]:text-white/70">
              <SelectValue placeholder="請選擇年級" />
            </SelectTrigger>
            <SelectContent className="bg-white/20 backdrop-blur-md border-white/30">
              {grades.map(grade => (
                <SelectItem key={grade} value={grade} className="text-white hover:bg-white/20">
                  {grade === 'Freshman' && '大一'}
                  {grade === 'Sophomore' && '大二'}
                  {grade === 'Junior' && '大三'}
                  {grade === 'Senior' && '大四'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* GPA 輸入 */}
        <div>
          <Label htmlFor="gpa" className="text-white font-medium">GPA</Label>
          <Input
            id="gpa"
            type="number"
            min={0}
            max={4.3}
            step={0.01}
            value={user.gpa ?? ''}
            onChange={(e) => setUser({ ...user, gpa: e.target.value ? parseFloat(e.target.value) : null })}
            placeholder="例如: 3.8"
            className="bg-white/10 border-white/30 text-white placeholder:text-white/70"
          />
          <p className="text-xs text-white/70 mt-1">滿分 4.3</p>
        </div>

        {/* 語言成績 */}
        <div className="space-y-3">
          <Label className="text-base font-semibold text-white">語言成績</Label>

          <div>
            <Label htmlFor="toefl" className="text-white font-medium">TOEFL iBT</Label>
            <Input
              id="toefl"
              type="number"
              min={0}
              max={120}
              value={user.toefl ?? ''}
              onChange={(e) => setUser({ ...user, toefl: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 90"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/70"
            />
          </div>

          <div>
            <Label htmlFor="ielts" className="text-white font-medium">IELTS</Label>
            <Input
              id="ielts"
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={user.ielts ?? ''}
              onChange={(e) => setUser({ ...user, ielts: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="例如: 7.0"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/70"
            />
          </div>

          <div>
            <Label htmlFor="toeic" className="text-white font-medium">TOEIC</Label>
            <Input
              id="toeic"
              type="number"
              min={0}
              max={990}
              value={user.toeic ?? ''}
              onChange={(e) => setUser({ ...user, toeic: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="例如: 850"
              className="bg-white/10 border-white/30 text-white placeholder:text-white/70"
            />
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            onClick={handleApplyFilter}
          >
            <Check className="w-4 h-4 mr-2" />
            套用篩選
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
            onClick={handleClearFilter}
          >
            <X className="w-4 h-4 mr-2" />
            清除篩選
          </Button>
        </div>
    </div>
  );
}
