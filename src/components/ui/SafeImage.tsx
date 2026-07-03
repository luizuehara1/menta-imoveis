import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { cn, getSafeImageUrl } from '../../lib/utils';
import { getOptimizedCloudinaryUrl } from '../../utils/image';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  className?: string;
  priority?: boolean;
  widthSize?: number;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className, 
  priority = false,
  fallbackSrc,
  widthSize = 800,
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(priority ? false : true);
  
  // Use robust helper for initial URL and fallback
  const safeSrc = getSafeImageUrl(src, fallbackSrc || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800");
  const optimizedSrc = getOptimizedCloudinaryUrl(safeSrc, widthSize);

  useEffect(() => {
    setError(false);
  }, [src]);

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
        onLoad={() => setLoading(false)}
        loading={priority ? "eager" : props.loading || "lazy"}
        decoding={priority ? "sync" : "async"}
        {...props}
      />
    </div>
  );
};
