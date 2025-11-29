import { useState, useRef } from 'react';

export type PanelType = 'search' | 'user' | 'wishlist';

export interface PanelState {
  isExpanded: boolean;
  isInitialized: boolean;
}

export interface PanelManager {
  panels: Record<PanelType, PanelState>;
  expandPanel: (panelType: PanelType) => void;
  collapsePanel: (panelType: PanelType) => void;
  togglePanel: (panelType: PanelType) => void;
  collapseAllPanels: () => void;
  isAnyPanelOpen: boolean;
  getPanelRef: (panelType: PanelType) => React.RefObject<HTMLDivElement>;
}

export function usePanelManager(): PanelManager {
  const [panels, setPanels] = useState<Record<PanelType, PanelState>>({
    search: { isExpanded: false, isInitialized: false },
    user: { isExpanded: false, isInitialized: false },
    wishlist: { isExpanded: false, isInitialized: false },
  });

  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const wishlistRef = useRef<HTMLDivElement>(null);

  const expandPanel = (panelType: PanelType) => {
    setPanels(prev => ({
      ...prev,
      [panelType]: { isExpanded: true, isInitialized: true }
    }));
  };

  const collapsePanel = (panelType: PanelType) => {
    setPanels(prev => ({
      ...prev,
      [panelType]: { isExpanded: false, isInitialized: prev[panelType].isInitialized }
    }));
  };

  const togglePanel = (panelType: PanelType) => {
    setPanels(prev => ({
      ...prev,
      [panelType]: { 
        isExpanded: !prev[panelType].isExpanded, 
        isInitialized: true 
      }
    }));
  };

  const collapseAllPanels = () => {
    setPanels(prev => ({
      search: { ...prev.search, isExpanded: false },
      user: { ...prev.user, isExpanded: false },
      wishlist: { ...prev.wishlist, isExpanded: false },
    }));
  };

  const isAnyPanelOpen = Object.values(panels).some(panel => panel.isExpanded);

  const getPanelRef = (panelType: PanelType): React.RefObject<HTMLDivElement> => {
    switch (panelType) {
      case 'search': return searchRef;
      case 'user': return userRef;
      case 'wishlist': return wishlistRef;
      default: return searchRef;
    }
  };

  return {
    panels,
    expandPanel,
    collapsePanel,
    togglePanel,
    collapseAllPanels,
    isAnyPanelOpen,
    getPanelRef,
  };
}
