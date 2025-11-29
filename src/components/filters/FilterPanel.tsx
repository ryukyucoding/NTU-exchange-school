import { useFilters } from '@/contexts/FilterContext';
import { useUserContext } from '@/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { REGIONS } from '@/utils/regions';

export default function FilterPanel() {
  const { filters, updateFilters, resetFilters } = useFilters();
  const { user } = useUserContext();

  const regions = REGIONS;
  const colleges = [
    '文學院', '理學院', '社會科學院', '醫學院', '工學院',
    '生農學院', '管理學院', '公衛學院', '電資學院', '法律學院', '生科學院'
  ];

  const handleApplyUserFilters = () => {
    updateFilters({
      gpaMin: user.gpa,
      toeflMin: user.toefl,
      ieltsMin: user.ielts,
      toeicMin: user.toeic,
      colleges: user.college ? [user.college] : [],
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>篩選條件</CardTitle>
        <div className="flex gap-2 mt-2">
          <Button onClick={handleApplyUserFilters} variant="outline" size="sm">
            套用我的資格
          </Button>
          <Button onClick={resetFilters} variant="ghost" size="sm">
            重置篩選
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 地區篩選 */}
        <div>
          <Label className="text-base font-semibold">地區</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {regions.map(region => (
              <div key={region.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`region-${region.value}`}
                  checked={filters.regions.includes(region.value)}
                  onCheckedChange={(checked) => {
                    const newRegions = checked
                      ? [...filters.regions, region.value]
                      : filters.regions.filter(r => r !== region.value);
                    updateFilters({ regions: newRegions });
                  }}
                />
                <Label htmlFor={`region-${region.value}`}>{region.label}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* 學院篩選 */}
        <div>
          <Label className="text-base font-semibold">學院</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {colleges.map(college => (
              <div key={college} className="flex items-center space-x-2">
                <Checkbox
                  id={`college-${college}`}
                  checked={filters.colleges.includes(college)}
                  onCheckedChange={(checked) => {
                    const newColleges = checked
                      ? [...filters.colleges, college]
                      : filters.colleges.filter(c => c !== college);
                    updateFilters({ colleges: newColleges });
                  }}
                />
                <Label htmlFor={`college-${college}`}>{college}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* GPA 篩選 */}
        <div>
          <Label className="text-base font-semibold">
            我的 GPA: {filters.gpaMin?.toFixed(2) ?? '未設定'}
          </Label>
          <Slider
            min={0}
            max={4.3}
            step={0.1}
            value={[filters.gpaMin ?? 0]}
            onValueChange={([value]) => updateFilters({ gpaMin: value })}
            className="mt-2"
          />
          <p className="text-sm text-gray-500 mt-1">
            只顯示 GPA 門檻 ≤ 我的 GPA 的學校
          </p>
        </div>

        {/* 語言成績篩選 */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">語言成績</Label>

          <div>
            <Label htmlFor="toefl">TOEFL iBT</Label>
            <Input
              id="toefl"
              type="number"
              min={0}
              max={120}
              value={filters.toeflMin ?? ''}
              onChange={(e) => updateFilters({
                toeflMin: e.target.value ? parseInt(e.target.value) : null
              })}
              placeholder="例如: 80"
            />
          </div>

          <div>
            <Label htmlFor="ielts">IELTS</Label>
            <Input
              id="ielts"
              type="number"
              min={0}
              max={9}
              step={0.5}
              value={filters.ieltsMin ?? ''}
              onChange={(e) => updateFilters({
                ieltsMin: e.target.value ? parseFloat(e.target.value) : null
              })}
              placeholder="例如: 6.5"
            />
          </div>

          <div>
            <Label htmlFor="toeic">TOEIC</Label>
            <Input
              id="toeic"
              type="number"
              min={0}
              max={990}
              value={filters.toeicMin ?? ''}
              onChange={(e) => updateFilters({
                toeicMin: e.target.value ? parseInt(e.target.value) : null
              })}
              placeholder="例如: 750"
            />
          </div>
        </div>

        {/* 搜尋關鍵字 */}
        <div>
          <Label htmlFor="search" className="text-base font-semibold">關鍵字搜尋</Label>
          <Input
            id="search"
            type="text"
            value={filters.searchKeyword}
            onChange={(e) => updateFilters({ searchKeyword: e.target.value })}
            placeholder="學校名稱、國家、城市..."
            className="mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
