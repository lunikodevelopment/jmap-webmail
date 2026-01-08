'use client';

import React, { useState, useEffect } from 'react';
import { getDomainFromEmail } from '@/lib/favicon';

interface FaviconProps {
  email: string;
  domain?: string;
  size?: 'sm' | 'md' | 'lg';
  fallback?: React.ReactNode;
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

// Global request tracking to prevent duplicate requests
declare global {
  interface Window {
    __faviconRequests?: Map<string, Promise<string>>;
  }
}

if (typeof window !== 'undefined' && !window.__faviconRequests) {
  window.__faviconRequests = new Map();
}

/**
 * Generate a consistent color from a string
 */
const getColorFromString = (str: string): string => {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Get initials from email
 */
const getInitials = (email: string): string => {
  const match = email.match(/^([a-zA-Z]).*@([a-zA-Z])/);
  if (match) {
    return (match[1] + match[2]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

/**
 * Try loading an image with timeout
 */
const tryLoadImage = async (url: string, timeout = 2000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error('Timeout'));
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve(url);
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Failed to load'));
    };

    img.crossOrigin = 'anonymous';
    img.src = url;
  });
};

/**
 * Get favicon URLs - try Cloudflare Worker first, then fallback services
 */
const getFaviconUrls = (domain: string): string[] => {
  if (!domain) return [];

  return [
    // 1. Cloudflare Worker first (handles HTML parsing for hashed favicons)
    `https://stormbox.luiv.workers.dev/?url=${domain}`,
    `https://stormbox.luiv.workers.dev/?url=https://${domain}`,
    // 2. DuckDuckGo's favicon service
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://icons.duckduckgo.com/ip2/${domain}.ico`,
    `https://icons.duckduckgo.com/ip/${domain}.ico`,
    // 3. Google favicon service
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    // 4. Additional services
    `https://icon.horse/icon/${domain}`,
    `https://icon.horse/icon/https://${domain}`,
    `https://favicon.vemetric.com/${domain}`,
  ];
};

/**
 * Favicon component that displays a website favicon for an email domain
 */
export function Favicon({
  email,
  domain,
  size = 'md',
  fallback,
  className = '',
}: FaviconProps) {
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!email) {
      setHasError(true);
      return;
    }

    const emailDomain = domain || getDomainFromEmail(email);

    if (!emailDomain) {
      setHasError(true);
      return;
    }

    const loadFavicon = async () => {
      const ongoingRequests = window.__faviconRequests || new Map();

      // Check if we already have an ongoing request for this domain
      if (ongoingRequests.has(emailDomain)) {
        const existingPromise = ongoingRequests.get(emailDomain);
        if (existingPromise instanceof Promise) {
          try {
            const result = await existingPromise;
            if (result) {
              setFaviconUrl(result);
              return;
            }
          } catch (err) {
            // Silence cache error
          }
        }
      }


      // Create new request
      const requestPromise = (async () => {
        const urls = getFaviconUrls(emailDomain);
        console.log('[Favicon] Generated', urls.length, 'favicon URLs for', emailDomain);

        if (!urls.length) {
          throw new Error('No favicon URLs');
        }

        // Try all URLs with timeouts
        const promises = urls.map((url, index) => {
          const isPriority = url.includes('stormbox.luiv.workers.dev');
          const timeout = isPriority ? 5000 : 2000;

          return tryLoadImage(url, timeout)
            .then((result) => {
              return { success: true, url: result };
            })
            .catch((error) => {
              return { success: false, url };
            });
        });

        // Wait for all attempts
        const results = await Promise.allSettled(promises);
        console.log('[Favicon] All attempts settled for', emailDomain, '- checking results');

        // Find first successful result
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (
            result.status === 'fulfilled' &&
            result.value &&
            result.value.success
          ) {
            console.log('[Favicon] Using result from index', i, ':', result.value.url);
            return result.value.url;
          }
        }

        throw new Error('All favicon attempts failed for ' + emailDomain);
      })();

      ongoingRequests.set(emailDomain, requestPromise);

      try {
        const result = await requestPromise;
        console.log('[Favicon] Final result for', emailDomain, ':', result);
        if (result) {
          setFaviconUrl(result);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.debug('[Favicon] Loading failed for', emailDomain, ':', error);
        setHasError(true);
      } finally {
        // Clear ongoing request after a delay
        setTimeout(() => {
          ongoingRequests.delete(emailDomain);
        }, 1000);
      }
    };

    loadFavicon();
  }, [email, domain]);

  if (!faviconUrl || hasError) {
    const bgColor = getColorFromString(email);
    const initials = getInitials(email);
    
    return (
      <div
        className={`${sizeMap[size]} rounded flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${className}`}
        style={{ backgroundColor: bgColor }}
        title={email}
      >
        {initials}
      </div>
    );
  }

  console.log('[Favicon] Rendering image for URL:', faviconUrl);
  return (
    <img
      src={faviconUrl}
      alt="Domain favicon"
      className={`${sizeMap[size]} rounded flex-shrink-0 object-contain ${className}`}
      onError={() => {
        console.error('[Favicon] Image load error for:', faviconUrl);
        setHasError(true);
      }}
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
}

export default Favicon;
