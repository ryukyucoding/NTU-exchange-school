'use client';

import { useState, useEffect, useRef } from 'react';
import { useMapZoom } from '@/contexts/MapZoomContext';

/**
 * 檢測元素下方背景的亮度
 * @param elementRef 要檢測的元素引用
 * @param sampleSize 採樣區域的大小（像素）
 * @returns 背景亮度值（0-255，值越大越亮）
 */
export function useBackgroundBrightness(
  elementRef: React.RefObject<HTMLElement>,
  sampleSize: number = 50
): number {
  const [brightness, setBrightness] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;

    const checkBrightness = () => {
      try {
        // 獲取元素的位置和尺寸
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height + sampleSize / 2; // 元素下方

        // 創建臨時 canvas 來讀取像素
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
          canvasRef.current.width = sampleSize;
          canvasRef.current.height = sampleSize;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // 嘗試從地圖容器中讀取像素
        // 由於地圖是 WebGL，我們需要通過截圖或使用 mapbox 的 API
        // 這裡我們使用一個簡化的方法：檢查元素下方的視覺區域
        
        // 獲取地圖容器
        const mapContainer = document.querySelector('.mapboxgl-map');
        if (!mapContainer) {
          // 如果找不到地圖容器，嘗試從整個頁面讀取
          const htmlElement = document.documentElement;
          const computedStyle = window.getComputedStyle(htmlElement);
          const bgColor = computedStyle.backgroundColor;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            // 解析 RGB 顏色
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              // 計算亮度（使用相對亮度公式）
              const calculatedBrightness = (r * 299 + g * 587 + b * 114) / 1000;
              setBrightness(calculatedBrightness);
              return;
            }
          }
          
          // 預設為深色背景
          setBrightness(50);
          return;
        }

        // 對於地圖，我們需要一個不同的方法
        // 由於地圖是 WebGL，我們無法直接讀取像素
        // 我們可以通過檢查地圖的樣式或使用其他啟發式方法
        
        // 方法：檢查地圖容器的背景色或使用 Intersection Observer
        // 但最簡單的方法是檢查地圖的縮放級別和位置來推斷背景色
        
        // 暫時使用一個簡化的方法：檢查元素下方是否有淺色背景
        // 我們可以通過檢查父容器的背景色來推斷
        
        const parent = element.parentElement;
        if (parent) {
          const parentStyle = window.getComputedStyle(parent);
          const bgColor = parentStyle.backgroundColor;
          
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const rgb = bgColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              const r = parseInt(rgb[0]);
              const g = parseInt(rgb[1]);
              const b = parseInt(rgb[2]);
              const calculatedBrightness = (r * 299 + g * 587 + b * 114) / 1000;
              setBrightness(calculatedBrightness);
              return;
            }
          }
        }

        // 預設為深色背景
        setBrightness(50);
      } catch (error) {
        console.error('Error checking background brightness:', error);
        setBrightness(50); // 預設為深色
      }
    };

    // 使用 Intersection Observer 和 ResizeObserver 來監聽變化
    const observer = new IntersectionObserver(
      () => {
        requestAnimationFrame(checkBrightness);
      },
      { threshold: 0.1 }
    );

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(checkBrightness);
    });

    if (element) {
      observer.observe(element);
      resizeObserver.observe(element);
      checkBrightness();
    }

    // 定期檢查（用於地圖移動時）
    const intervalId = setInterval(() => {
      requestAnimationFrame(checkBrightness);
    }, 500);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      clearInterval(intervalId);
    };
  }, [elementRef, sampleSize]);

  return brightness;
}

/**
 * 檢測地圖區域的亮度（針對 Mapbox）
 * 通過地圖縮放級別來判斷背景亮度
 * @param threshold 縮放級別閾值，超過此值時使用微微白色背景（預設為 4）
 * @returns 是否為高縮放級別（true 表示縮放級別 >= 閾值，需要使用微微白色背景）
 */
export function useMapBackgroundBrightness(
  threshold: number = 4
): boolean {
  const { zoomLevel } = useMapZoom();
  const [isHighZoom, setIsHighZoom] = useState(false);

  useEffect(() => {
    // 當縮放級別大於等於閾值時，返回 true（使用微微白色背景）
    // 當縮放級別小於閾值時，返回 false（使用原始樣式）
    setIsHighZoom(zoomLevel >= threshold);
  }, [zoomLevel, threshold]);

  return isHighZoom;
}

