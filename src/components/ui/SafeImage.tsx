import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  className?: string;
  priority?: boolean;
}

export const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className, 
  priority = false,
  fallbackSrc = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
  ...props 
}) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(priority ? false : true);

  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imgRef.current?.complete && loading) {
      setLoading(false);
    }
  }, [loading, src]);

  // Handle case where src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
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
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn("w-full h-full object-cover transition-opacity duration-300", loading ? "opacity-0" : "opacity-100")}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={(e) => {
          console.warn("Image load failed, trying fallback:", src);
          setError(true);
        }}
        onLoad={() => setLoading(false)}
        loading={priority ? "eager" : props.loading || "lazy"}
        {...props}
      />
    </div>
  );
};
