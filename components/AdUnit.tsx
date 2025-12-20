import React, { useEffect } from 'react';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  layoutKey?: string; // For In-feed ads
  className?: string;
  style?: React.CSSProperties;
  label?: string; // e.g. "Advertisement"
}

// Replace this with your actual Google AdSense Publisher ID
const PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXX'; 

export const AdUnit: React.FC<AdUnitProps> = ({ 
  slotId, 
  format = 'auto', 
  layoutKey, 
  className = '', 
  style = {},
  label = 'Advertisement'
}) => {

  useEffect(() => {
    try {
      // @ts-ignore
      const adsbygoogle = window.adsbygoogle || [];
      // @ts-ignore
      adsbygoogle.push({});
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  // If in demo mode (no valid slot ID provided), show a placeholder
  if (slotId === 'DEMO_SLOT') {
    return (
      <div className={`bg-slate-800/50 border border-slate-700/50 flex flex-col items-center justify-center text-slate-600 overflow-hidden ${className}`} style={style}>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{label}</span>
        <span className="text-xs">Google Ad Space</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
      <span className="text-[10px] text-slate-600 uppercase tracking-widest mb-1 self-start ml-1 opacity-0 hover:opacity-100 transition-opacity">
        {label}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
        data-ad-layout-key={layoutKey}
      />
    </div>
  );
};