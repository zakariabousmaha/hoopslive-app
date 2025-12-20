import React from 'react';
import { AdUnit } from './AdUnit';

interface StickyAdRailProps {
  position: 'left' | 'right';
}

export const StickyAdRail: React.FC<StickyAdRailProps> = ({ position }) => {
  // Only show on very large screens (2xl and up) to avoid squishing content
  return (
    <div 
      className={`
        fixed top-24 bottom-0 w-[160px] hidden 2xl:flex flex-col gap-4 z-0
        ${position === 'left' ? 'left-4' : 'right-4'}
      `}
    >
      {/* Tall Skyscraper Ad */}
      <AdUnit 
        slotId="DEMO_SLOT" // Replace with real slot ID for Skyscraper (e.g., 160x600)
        format="vertical"
        style={{ height: '600px', width: '160px' }}
        className="w-full h-[600px]"
      />
      
      {/* Smaller square ad below it for when scrolling further */}
      <AdUnit 
        slotId="DEMO_SLOT" 
        format="rectangle"
        style={{ height: '250px', width: '160px' }}
        className="w-full h-[250px] mt-4"
      />
    </div>
  );
};