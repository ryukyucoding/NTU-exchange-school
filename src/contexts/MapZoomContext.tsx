'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface MapZoomContextType {
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
}

const MapZoomContext = createContext<MapZoomContextType | undefined>(undefined);

export function MapZoomProvider({ children }: { children: ReactNode }) {
  const [zoomLevel, setZoomLevel] = useState<number>(2);

  return (
    <MapZoomContext.Provider value={{ zoomLevel, setZoomLevel }}>
      {children}
    </MapZoomContext.Provider>
  );
}

export function useMapZoom() {
  const context = useContext(MapZoomContext);
  if (context === undefined) {
    throw new Error('useMapZoom must be used within a MapZoomProvider');
  }
  return context;
}

