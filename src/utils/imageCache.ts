/**
 * Image Cache Utilities
 * Separated from component file for better organization
 */

// In-memory cache for loaded images
const imageCache = new Set<string>();
const loadingImages = new Map<string, Promise<void>>();

/**
 * Preload images that will be needed soon
 */
export const preloadImage = (src: string): Promise<void> => {
  if (imageCache.has(src)) {
    return Promise.resolve();
  }

  if (loadingImages.has(src)) {
    return loadingImages.get(src)!;
  }

  const loadPromise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      loadingImages.delete(src);
      resolve();
    };
    img.onerror = () => {
      loadingImages.delete(src);
      reject();
    };
    img.src = src;
  });

  loadingImages.set(src, loadPromise);
  return loadPromise;
};

/**
 * Clear image cache (useful for memory management)
 */
export const clearImageCache = () => {
  imageCache.clear();
  loadingImages.clear();
};

/**
 * Check if image is cached
 */
export const isImageCached = (src: string): boolean => {
  return imageCache.has(src);
};

/**
 * Get cache statistics
 */
export const getImageCacheStats = () => {
  return {
    cachedCount: imageCache.size,
    loadingCount: loadingImages.size,
  };
};

// Export internal cache for component use
export { imageCache, loadingImages };
