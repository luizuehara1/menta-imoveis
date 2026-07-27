import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { cn, getSafeImageUrl } from '../../lib/utils';
import { getOptimizedCloudinaryUrl } from '../../utils/image';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  className?: string;
  priority?: boolean;
  widthSize?: number;
  watermarkUrl?: string;
  aplicarMarcaDagua?: boolean;
  watermarkClassName?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className, 
  priority = false,
  fallbackSrc,
  widthSize = 800,
  watermarkUrl,
  aplicarMarcaDagua = false,
  watermarkClassName,
  onLoad,
  onError,
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(priority ? false : true);
  
  // Use robust helper for initial URL and fallback
  const safeSrc = getSafeImageUrl(src, fallbackSrc || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800");
  const optimizedSrc = getOptimizedCloudinaryUrl(safeSrc, widthSize);

  useEffect(() => {
    setError(false);
    if (!priority) {
      setLoading(true);
    }
  }, [src, priority]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.warn("[SafeImage] Load failed:", src);
    setError(true);
    setLoading(false);
    
    // Explicitly set fallback source on the element to ensure visual consistency
    if (fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    } else {
      e.currentTarget.src = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200";
    }
    if (onError) {
      onError(e);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoading(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  if (!src && !fallbackSrc) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 text-gray-400", className)} style={props.style}>
        <div className="text-center p-4">
          <ImageOff size={24} className="mx-auto mb-2 opacity-20" />
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Imagem não disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {loading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
           <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      )}
      <img
        src={error ? (fallbackSrc || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=1200") : optimizedSrc}
        alt={alt}
        className={cn("w-full h-full object-cover transition-opacity duration-300", loading ? "opacity-0" : "opacity-100")}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading={priority ? "eager" : props.loading || "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : (props as any).fetchPriority || "auto"}
        {...props}
      />
      {/* Watermark overlay: ONLY rendered when main image is loaded (loading is false) and not in error state */}
      {aplicarMarcaDagua && watermarkUrl && !loading && !error && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-20 select-none animate-fadeIn">
          <img 
            src={watermarkUrl} 
            alt="Watermark" 
            className={cn("w-[45%] max-w-[320px] opacity-[0.08] object-contain select-none pointer-events-none transition-opacity duration-300", watermarkClassName)}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
};
