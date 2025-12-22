'use client';

import { SchoolWithMatch } from '@/types/school';
import Map, { Marker, Popup, useMap } from 'react-map-gl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink, X, Info } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useState, useCallback, useEffect } from 'react';
import { useMapBackgroundBrightness } from '@/hooks/useBackgroundBrightness';
import { useMapZoom } from '@/contexts/MapZoomContext';
import SchoolDetailModal from '@/components/school-display/SchoolDetailModal';
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
    '中語組': '#F97316',      // 橘紅色
    '韓語組': '#84CC16',      // 黃綠色
  };

  return groupColors[applicationGroup] || '#6B7280'; // 預設灰色
}

// 內部組件：用於獲取地圖實例並計算 Popup 位置
function PopupWithDynamicPosition({ 
  school, 
  onClose,
  onOpenDetails,
}: { 
  school: SchoolWithMatch; 
  onClose: () => void;
  onOpenDetails: (school: SchoolWithMatch) => void;
}) {
  const { current: map } = useMap();
  const [popupAnchor, setPopupAnchor] = useState<'top' | 'bottom'>('bottom');
  const [popupOffset, setPopupOffset] = useState<[number, number]>([0, -10]);

  // 計算地標在畫面中的位置並設置 Popup 位置
  const calculatePopupPosition = useCallback(() => {
    if (!map) return;

    try {
      // 將經緯度轉換為屏幕坐標（point.y 是從頂部開始的像素距離）
      const point = map.project([school.longitude, school.latitude]);
      
      // 獲取地圖容器的尺寸
      const mapContainer = map.getContainer();
      if (!mapContainer) return;
      
      const mapHeight = mapContainer.clientHeight;
      if (mapHeight === 0) return;
      
      // 計算地標在畫面中的垂直位置（百分比，0 = 頂部，1 = 底部）
      const verticalPosition = point.y / mapHeight;
      
      // react-map-gl 的 anchor 屬性：
      // - anchor="top": Popup 的頂部錨定到地標，Popup 顯示在地標下方
      // - anchor="bottom": Popup 的底部錨定到地標，Popup 顯示在地標上方
      
      // 如果地標在畫面上半部（垂直位置 <= 50%），Popup 顯示在地標下方
      // 如果地標在畫面下半部（垂直位置 > 50%），Popup 顯示在地標上方
      if (verticalPosition <= 0.5) {
        // 地標在上半部，視窗顯示在下方
        setPopupAnchor('top');
        setPopupOffset([0, 10]); // 向下偏移 10px
      } else {
        // 地標在下半部，視窗顯示在上方
        setPopupAnchor('bottom');
        setPopupOffset([0, -10]); // 向上偏移 10px
      }
    } catch (_error) {
      // 如果計算失敗，使用預設值（顯示在下方）
      setPopupAnchor('top');
      setPopupOffset([0, 10]);
    }
  }, [map, school.longitude, school.latitude]);

  // 當學校改變或地圖移動/縮放時重新計算位置
  useEffect(() => {
    if (!map) return;
    
    // 立即計算位置（使用多個時機確保計算成功）
    const calculate = () => {
      requestAnimationFrame(() => {
        calculatePopupPosition();
      });
    };
    
    // 立即計算一次
    calculate();
    
    // 如果地圖已加載，立即再計算一次
    if (map.loaded()) {
      calculate();
    } else {
      map.once('load', calculate);
    }
    
    // 監聽地圖移動和縮放事件
    const updatePosition = () => {
      requestAnimationFrame(() => {
        calculatePopupPosition();
      });
    };
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);
    map.on('render', updatePosition);
    
    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      map.off('render', updatePosition);
    };
  }, [map, school.longitude, school.latitude, calculatePopupPosition]);

  return (
    <Popup
      longitude={school.longitude}
      latitude={school.latitude}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      maxWidth="320px"
      offset={popupOffset}
      anchor={popupAnchor}
      style={{
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0
      }}
    >
      <PopupContent school={school} onClose={onClose} onOpenDetails={onOpenDetails} />
    </Popup>
  );
}

// Popup 內容組件
function PopupContent({ 
  school, 
  onClose,
  onOpenDetails,
}: { 
  school: SchoolWithMatch; 
  onClose: () => void;
  onOpenDetails: (school: SchoolWithMatch) => void;
}) {
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const inWishlist = isInWishlist(school.id);

  return (
    <div
      className="backdrop-blur-md rounded-lg shadow-2xl p-4 relative w-80 flex flex-col pointer-events-auto"
      style={{
        // 若 CSS 變數沒載入，fallback 回一個「有點藍」的半透明色，避免變透明
        backgroundColor: 'var(--map-popup-bg, rgba(9, 47, 83, 0.72))',
        border: '1px solid rgba(255, 255, 255, 0.4)',
      }}
    >
      {/* 關閉按鈕 */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/20"
        onClick={() => {
          onClose();
        }}
      >
        <X className="w-4 h-4" />
      </Button>
      
      {/* 標題區域 */}
      <div className="flex justify-between items-start mb-4 pr-8">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg text-white font-semibold truncate">{school.name_zh}</h3>
          <p className="text-sm text-white/70 truncate">{school.name_en}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-white border-white/30">
              {school.country}
            </Badge>
            <Badge variant="outline" className="text-white border-white/30">
              {school.region === 'Americas' ? '美洲' : 
               school.region === 'Europe' ? '歐洲' :
               school.region === 'Asia' ? '亞洲' :
               school.region === 'Oceania' ? '大洋洲' : school.region}
            </Badge>
          </div>
        </div>

        <button
          className="ml-2 flex-shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-md bg-transparent shadow-none text-white/80 border border-transparent transition-all duration-200 ease-out hover:bg-white/40 hover:text-white hover:border-white/50 active:bg-white/40 focus-visible:bg-white/40 focus-visible:text-white focus-visible:border-white/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          onClick={() => {
            if (inWishlist) {
              removeFromWishlist(school.id);
            } else {
              addToWishlist(school);
            }
          }}
        >
          <Heart
            className={`w-4 h-4 ${inWishlist ? 'fill-current text-red-500' : 'text-white/80'}`}
          />
        </button>
      </div>

      {/* 按鈕區域 */}
      <div className="flex gap-2 pt-3 border-t border-white/20">
        <Button
          variant="outline"
          className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(school);
            onClose();
          }}
        >
          <Info className="w-4 h-4 mr-2" />
          詳細資訊
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="bg-white/10 text-white hover:bg-white/20"
          onClick={() => window.open(school.url, '_blank')}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function MapView({ schools }: MapViewProps) {
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithMatch | null>(null);
  const [detailSchool, setDetailSchool] = useState<SchoolWithMatch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const { setZoomLevel } = useMapZoom();
  const isHighZoom = useMapBackgroundBrightness(3);

  // 當組件掛載時，重置縮放級別為初始值（確保切換頁面時恢復預設狀態）
  useEffect(() => {
    setZoomLevel(2);
  }, [setZoomLevel]);

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
      {/* 調試信息 - 臨時顯示縮放級別 */}
      {/* <div className="absolute top-20 left-4 bg-black/70 text-white p-2 rounded z-50 text-xs">
        縮放級別: {zoomLevel.toFixed(2)} | 高縮放: {isHighZoom ? '是' : '否'}
      </div> */}
      
      {/* 圖例 - 右下角 */}
      <div 
        className={`absolute bottom-4 right-4 backdrop-blur-md p-3 rounded-lg z-10 max-w-xs shadow-2xl transition-all duration-300 ${
          isHighZoom 
            ? 'bg-white/30 border-[rgba(255,255,255,0.35)] text-gray-800' 
            : 'bg-white/10 border-[rgba(255,255,255,0.2)] text-white'
        }`}
      >
        <h3 className={`text-sm font-semibold mb-2 drop-shadow-lg transition-all duration-300 ${
          isHighZoom ? 'text-gray-800' : 'text-white'
        }`}>申請組別</h3>
        <div className={`space-y-1 text-xs transition-all duration-300 ${
          isHighZoom ? 'text-gray-800' : 'text-white'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#3B82F6' }}></div>
            <span className="drop-shadow-md">一般組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#06B6D4' }}></div>
            <span className="drop-shadow-md">英語組</span>
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
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#F97316' }}></div>
            <span className="drop-shadow-md">中語組</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: '#84CC16' }}></div>
            <span className="drop-shadow-md">韓語組</span>
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
          zoom: 2,
          padding: {
            top: 100,
            right: 0,
            bottom: 0,
            left: 0
          }
        }}
        onMoveEnd={(evt) => {
          // 更新縮放級別到 Context（只在移動結束時更新）
          setZoomLevel(evt.viewState.zoom);
        }}
        onZoomEnd={(evt) => {
          // 更新縮放級別到 Context（只在縮放結束時更新）
          setZoomLevel(evt.viewState.zoom);
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/yuuuuuuuuuu/cmjfofvq9003w01sg1khze8k0"
      >
        {schoolsWithCoordinates.map(school => {
          const markerColor = getMarkerColor(school.application_group);
          const isHovered = hoveredMarkerId === school.id;
          return (
            <Marker
              key={school.id}
              longitude={school.longitude}
              latitude={school.latitude}
              onClick={() => {
                setSelectedSchool(school);
                // If side detail panel is open, update it to the new school without closing/re-opening.
                if (isDetailOpen) {
                  setDetailSchool(school);
                }
              }}
              style={{
                zIndex: isHovered ? 9999 : 0
              }}
            >
              <div
                className="cursor-pointer group relative"
                data-map-marker="true"
                onMouseEnter={() => setHoveredMarkerId(school.id)}
                onMouseLeave={() => setHoveredMarkerId(null)}
              >
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: markerColor }}
                >
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                {/* 大學名稱標籤 - 顯示在 marker 上方 */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {school.name_zh}
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedSchool && (
          <PopupWithDynamicPosition
            school={selectedSchool}
            onClose={() => setSelectedSchool(null)}
            onOpenDetails={(s) => {
              setDetailSchool(s);
              setIsDetailOpen(true);
            }}
          />
        )}
      </Map>

      <SchoolDetailModal
        school={detailSchool}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailSchool(null);
        }}
        variant="wishlist"
        presentation="side"
      />
    </div>
  );
}
