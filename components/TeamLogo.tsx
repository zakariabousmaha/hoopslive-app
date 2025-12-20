import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

interface TeamLogoProps {
  src?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

export const TeamLogo: React.FC<TeamLogoProps> = ({ src, alt, className = "", loading = "lazy" }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the src prop changes (e.g. recycling components in virtual lists)
  useEffect(() => {
      setHasError(false);
  }, [src]);

  // Combined class names for fallback. 
  // We apply flex centering and background colors to ensure the fallback icon looks good within the circle.
  const fallbackClasses = `flex items-center justify-center bg-slate-800 text-slate-600 border border-slate-700 overflow-hidden ${className}`;

  if (!src || hasError) {
    return (
      <div className={fallbackClasses} aria-label={alt} role="img">
        <Shield className="w-[60%] h-[60%] opacity-50" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      loading={loading}
      decoding="async"
    />
  );
};