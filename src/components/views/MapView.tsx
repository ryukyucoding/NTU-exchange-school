import { SchoolWithMatch } from '@/types/school';
import Map, { Marker, Popup } from 'react-map-gl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink, X, Info } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapViewProps {
  schools: SchoolWithMatch[];
}

// 根據申請組別返回對應的顏色
function getMarkerColor(applicationGroup: string): string {
  const groupColors: { [key: string]: string } = {
    '一般組': '#3B82F6',      // 藍色
    '法語組': '#EF4444',      // 紅色
    '德語組': '#10B981',      // 綠色
    '西語組': '#F59E0B',      // 橙色
    '日語組': '#8B5CF6',      // 紫色
    '日語組/一般組': '#EC4899', // 粉色
    '英語組': '#06B6D4',      // 青色
  };
  
  return groupColors[applicationGroup] || '#6B7280'; // 預設灰色
}

export default function MapView({ schools }: MapViewProps) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithMatch | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // 過濾掉沒有有效經緯度的學校
  const schoolsWithCoordinates = schools.filter(school => 
    school.latitude !== 0 && 
    school.longitude !== 0 && 
    !isNaN(school.latitude) && 
    !isNaN(school.longitude)
  );

  // 計算地圖中心點（所有有效學校的平均經緯度）
  const center: [number, number] = schoolsWithCoordinates.length > 0
    ? [
        schoolsWithCoordinates.reduce((sum, s) => sum + s.longitude, 0) / schoolsWithCoordinates.length,
        schoolsWithCoordinates.reduce((sum, s) => sum + s.latitude, 0) / schoolsWithCoordinates.length,
      ]
    : [20.0, 25.0]; // 預設中心點

  if (schoolsWithCoordinates.length === 0) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">
          {schools.length === 0 
            ? "沒有學校可以顯示在地圖上" 
            : "沒有學校有有效的經緯度資料"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative">
      {/* 圖例 - 右下角 */}

      <div className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-lg z-10 max-w-xs shadow-2xl">
        <h3 className="text-sm font-semibold mb-2 drop-shadow-lg">申請組別</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="drop-shadow-md">一般組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="drop-shadow-md">法語組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#10B981' }}></div>
            <span className="drop-shadow-md">德語組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#F59E0B' }}></div>
            <span className="drop-shadow-md">西語組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#8B5CF6' }}></div>
            <span className="drop-shadow-md">日語組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#EC4899' }}></div>
            <span className="drop-shadow-md">日語組/一般組</span>
          </div>
        </div>
      </div>

      <Map
        mapboxAccessToken="pk.eyJ1IjoieXV1dXV1dXV1dXUiLCJhIjoiY21nbmxmdnJlMHV3djJpcjVjMnM4d3Q1aiJ9._yqd6BliWVZ9watWky3-gg"
        initialViewState={{
          longitude: center[0],
          latitude: center[1],
          zoom: 2
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        {schoolsWithCoordinates.map(school => {
          const markerColor = getMarkerColor(school.application_group);
          return (
            <Marker
              key={school.id}
              longitude={school.longitude}
              latitude={school.latitude}
              onClick={() => {
                setSelectedSchool(school);
              }}
            >
              <div className="cursor-pointer group">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: markerColor }}
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                {/* 大學名稱標籤 */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {school.name_zh}
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedSchool && (
          <Popup
            longitude={selectedSchool.longitude}
            latitude={selectedSchool.latitude}
            onClose={() => setSelectedSchool(null)}
            closeButton={false}
            closeOnClick={false}
            maxWidth="320px"
            offset={[0, -10] as [number, number]}
            anchor="bottom"
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: 0
            }}
          >
            <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-lg shadow-2xl p-4 relative w-80 flex flex-col">
              {/* 關閉按鈕 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/20"
                onClick={() => {
                  setSelectedSchool(null);
                  setShowDetails(false);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              
              {/* 標題區域 */}
              <div className="flex justify-between items-start mb-4 pr-8">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg text-white font-semibold truncate">{selectedSchool.name_zh}</h3>
                  <p className="text-sm text-white/70 truncate">{selectedSchool.name_en}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-white border-white/30">
                      {selectedSchool.country}
                    </Badge>
                    <Badge variant="outline" className="text-white border-white/30">
                      {selectedSchool.region === 'Americas' ? '美洲' : 
                       selectedSchool.region === 'Europe' ? '歐洲' :
                       selectedSchool.region === 'Asia' ? '亞洲' :
                       selectedSchool.region === 'Oceania' ? '大洋洲' : selectedSchool.region}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant={isInWishlist(selectedSchool.id) ? "default" : "outline"}
                  size="icon"
                  className="ml-2 flex-shrink-0"
                  onClick={() => {
                    if (isInWishlist(selectedSchool.id)) {
                      removeFromWishlist(selectedSchool.id);
                    } else {
                      addToWishlist(selectedSchool);
                    }
                  }}
                >
                  <Heart className={isInWishlist(selectedSchool.id) ? "fill-current" : ""} />
                </Button>
              </div>

              {/* 詳細資料區域 */}
              {showDetails && (
                <div className="mb-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">申請組別:</span>
                    <span className="font-medium text-white text-right">
                      {selectedSchool.application_group || '無限制'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/70">年級限制:</span>
                    <span className="font-medium text-white text-right">
                      {selectedSchool.grade_requirement || '無限制'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/70">GPA 要求:</span>
                    <span className="font-medium text-white text-right">
                      {selectedSchool.gpa_min ? `${selectedSchool.gpa_min} 以上` : '無限制'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/70">學院限制:</span>
                    <span className="font-medium text-white text-right">
                      {selectedSchool.restricted_colleges && selectedSchool.restricted_colleges !== '無' && selectedSchool.restricted_colleges.trim() !== ''
                        ? selectedSchool.restricted_colleges 
                        : '無限制'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/70">語言要求:</span>
                    <span className="font-medium text-white text-right">
                      {(() => {
                        const requirements = [];
                        if (selectedSchool.toefl_ibt) requirements.push(`TOEFL ${selectedSchool.toefl_ibt}`);
                        if (selectedSchool.ielts) requirements.push(`IELTS ${selectedSchool.ielts}`);
                        if (selectedSchool.toeic) requirements.push(`TOEIC ${selectedSchool.toeic}`);
                        return requirements.length > 0 ? requirements.join(' / ') : '無限制';
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/70">名額:</span>
                    <span className="font-medium text-white text-right">
                      {selectedSchool.quota || '未提供'}
                    </span>
                  </div>
                </div>
              )}

              {/* 按鈕區域 */}
              <div className="flex gap-2 pt-3 border-t border-white/20">
                <Button
                  variant="outline"
                  className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  詳細資訊
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/10 text-white hover:bg-white/20"
                  onClick={() => window.open(selectedSchool.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
