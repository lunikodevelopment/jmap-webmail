/**
 * Favicon utility for fetching and caching website favicons
 */

const faviconCache = new Map<string, string>();
const FAVICON_API = 'https://stormbox.luiv.workers.dev';

/**
 * Extract domain from email address
 */
export function getDomainFromEmail(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : '';
}

/**
 * Get favicon URL for a domain using Stormbox favicon proxy
 * Uses custom Cloudflare Worker for reliable favicon fetching
 */
export function getFaviconUrl(domain: string): string {
  if (!domain) return '';
  
  // Check cache first
  if (faviconCache.has(domain)) {
    return faviconCache.get(domain) || '';
  }
  
  // Use Stormbox favicon proxy worker
  // Format: https://stormbox.luiv.workers.dev?url={domain}
  const url = `${FAVICON_API}?url=${encodeURIComponent(domain)}`;
  
  // Cache the URL
  faviconCache.set(domain, url);
  
  return url;
}

/**
 * Get favicon URL from email address
 */
export function getFaviconUrlFromEmail(email: string): string {
  const domain = getDomainFromEmail(email);
  return getFaviconUrl(domain);
}

/**
 * Preload a favicon to validate it exists
 * Returns the URL if successful, empty string if not
 */
export async function preloadFavicon(domain: string): Promise<string> {
  const url = getFaviconUrl(domain);
  
  if (!url) return '';
  
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    
    // DuckDuckGo always returns 200, but we can still return the URL
    return url;
  } catch (error) {
    console.debug('Failed to preload favicon for:', domain, error);
    return '';
  }
}

/**
 * Clear the favicon cache (useful for testing or manual cache clear)
 */
export function clearFaviconCache(): void {
  faviconCache.clear();
}

/**
 * Get cache size (useful for debugging)
 */
export function getFaviconCacheSize(): number {
  return faviconCache.size;
}
