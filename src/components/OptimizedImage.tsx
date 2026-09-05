/**
 * Optimized Image Component with Lazy Loading and Caching
 * Prevents re-downloading images on every navigation
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { imageCache, loadingImages } from '@/utils/imageCache';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
  eager?: boolean; // Skip lazy loading for above-the-fold images
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  className,
  containerClassName,
  eager = false,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(
    imageCache.has(src) ? src : fallback
  );
  const [isLoading, setIsLoading] = useState(!imageCache.has(src));
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // If already cached, use cached version immediately
    if (imageCache.has(src)) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    // If eager loading or IntersectionObserver not supported, load immediately
    if (eager || !('IntersectionObserver' in window)) {
      loadImage(src);
      return;
    }

    // Lazy load with IntersectionObserver
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage(src);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, eager]);

  const loadImage = async (imageSrc: string) => {
    // Check if this image is already being loaded
    if (loadingImages.has(imageSrc)) {
      await loadingImages.get(imageSrc);
      setImageSrc(imageSrc);
      setIsLoading(false);
      return;
    }

    // Create loading promise
    const loadPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        imageCache.add(imageSrc);
        setImageSrc(imageSrc);
        setIsLoading(false);
        loadingImages.delete(imageSrc);
        resolve();
      };

      img.onerror = () => {
        setError(true);
        setIsLoading(false);
        loadingImages.delete(imageSrc);
        reject();
      };

      img.src = imageSrc;
    });

    loadingImages.set(imageSrc, loadPromise);
    
    try {
      await loadPromise;
    } catch {
      // Error handled in onerror callback
    }
  };

  const handleError = () => {
    if (!error && imageSrc !== fallback) {
      setError(true);
      setImageSrc(fallback);
    }
  };

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};

// Avatar component with optimized image loading
export const OptimizedAvatar: React.FC<{
  src?: string;
  alt: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}> = ({ src, alt, fallbackText, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium',
          sizeClasses[size],
          className
        )}
      >
        {fallbackText || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      eager={true} // Avatars are usually above the fold
      containerClassName={cn('rounded-full', sizeClasses[size], className)}
      className="w-full h-full object-cover"
    />
  );
};

