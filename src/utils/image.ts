/**
 * Centralized image optimization utility for Menta Imóveis.
 * Applies Cloudinary transformations (f_auto, q_auto, resize) and provides fallbacks.
 */

export const FALLBACK_IMAGE = '/placeholder-imovel.png';

export function getOptimizedCloudinaryUrl(url: string | null | undefined, width = 800): string {
  if (!url) return FALLBACK_IMAGE;
  
  const trimmed = url.trim();
  if (!trimmed) return FALLBACK_IMAGE;

  // Local assets or base64 data URLs should be returned as-is
  if (trimmed.startsWith('/') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Unsplash optimization
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('w', width.toString());
      parsed.searchParams.set('q', '80');
      parsed.searchParams.set('auto', 'format');
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // Cloudinary optimization
  if (trimmed.includes('cloudinary.com')) {
    if (trimmed.includes('/upload/')) {
      // Ensure we don't double inject transformations if some are already there
      const hasTransformations = /\/upload\/v\d+\//.test(trimmed) === false && trimmed.split('/upload/')[1]?.startsWith('f_');
      if (!hasTransformations) {
        return trimmed.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
      }
    }
  }

  return trimmed;
}
