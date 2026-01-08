/**
 * Favicon Fetching Utilities
 * Utilities for fetching and caching favicons from email domains
 */

interface FaviconCache {
  domain: string;
  url: string;
  fetchedAt: Date;
  expiresAt: Date;
}

const FAVICON_CACHE: Map<string, FaviconCache> = new Map();
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FAVICON_SERVICES = [
  'https://www.google.com/s2/favicons?domain={domain}&sz=64',
  'https://icons.duckduckgo.com/ip3/{domain}.ico',
  'https://favicone.com/{domain}?s=64',
];

/**
 * Extract domain from email address
 */
export function extractDomainFromEmail(email: string): string {
  const match = email.match(/@(.+)$/);
  return match ? match[1] : '';
}

/**
 * Get favicon URL for a domain
 * Uses multiple services as fallback
 */
export function getFaviconUrl(domain: string, service: number = 0): string {
  if (service >= FAVICON_SERVICES.length) {
    return getDefaultFavicon();
  }
  return FAVICON_SERVICES[service].replace('{domain}', domain);
}

/**
 * Get default favicon (generic email icon)
 */
export function getDefaultFavicon(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"%3E%3Crect x="2" y="4" width="20" height="16" rx="2"/%3E%3Cpath d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/%3E%3C/svg%3E';
}

/**
 * Fetch favicon for an email address
 * Caches results to avoid repeated requests
 */
export async function fetchFaviconForEmail(email: string): Promise<string> {
  const domain = extractDomainFromEmail(email);
  
  if (!domain) {
    return getDefaultFavicon();
  }

  // Check cache
  const cached = FAVICON_CACHE.get(domain);
  if (cached && new Date() < cached.expiresAt) {
    return cached.url;
  }

  // Try to fetch favicon
  const faviconUrl = await fetchFaviconWithFallback(domain);
  
  // Cache the result
  FAVICON_CACHE.set(domain, {
    domain,
    url: faviconUrl,
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
  });

  return faviconUrl;
}

/**
 * Fetch favicon with fallback services
 */
async function fetchFaviconWithFallback(domain: string, serviceIndex: number = 0): Promise<string> {
  if (serviceIndex >= FAVICON_SERVICES.length) {
    return getDefaultFavicon();
  }

  try {
    const url = getFaviconUrl(domain, serviceIndex);
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'force-cache',
    });

    if (response.ok || response.status === 0) {
      return url;
    }
  } catch (error) {
    // Silently fail and try next service
  }

  return fetchFaviconWithFallback(domain, serviceIndex + 1);
}

/**
 * Batch fetch favicons for multiple emails
 */
export async function fetchFaviconsForEmails(emails: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  
  const promises = emails.map(async (email) => {
    const favicon = await fetchFaviconForEmail(email);
    results.set(email, favicon);
  });

  await Promise.all(promises);
  return results;
}

/**
 * Clear favicon cache
 */
export function clearFaviconCache(): void {
  FAVICON_CACHE.clear();
}

/**
 * Clear expired favicons from cache
 */
export function clearExpiredFavicons(): void {
  const now = new Date();
  for (const [domain, cache] of FAVICON_CACHE.entries()) {
    if (now > cache.expiresAt) {
      FAVICON_CACHE.delete(domain);
    }
  }
}

/**
 * Get cache statistics
 */
export function getFaviconCacheStats(): {
  size: number;
  domains: string[];
} {
  return {
    size: FAVICON_CACHE.size,
    domains: Array.from(FAVICON_CACHE.keys()),
  };
}
