import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  persistToIndexedDB?: boolean;
  staleWhileRevalidate?: boolean;
  maxAge?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_NAME = 'fantasy-sports-cache-v1';

class DataCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private dbName = 'FantasySportsDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    if (this.db || typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry;
    }

    // Check IndexedDB
    if (!this.db) await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && !this.isExpired(result)) {
          // Update memory cache
          this.memoryCache.set(key, result);
          resolve(result);
        } else {
          if (result) {
            // Remove expired entry
            this.delete(key);
          }
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    });
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      etag: options.maxAge ? `${Date.now()}-${JSON.stringify(data).length}` : undefined,
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Set in IndexedDB if enabled
    if (options.persistToIndexedDB !== false) {
      if (!this.db) await this.initDB();
      if (this.db) {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put({ key, ...entry });
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (!this.db) await this.initDB();
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (!this.db) await this.initDB();
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      store.clear();
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt;
  }

  // Cleanup expired entries
  async cleanup(): Promise<void> {
    // Memory cache cleanup
    const entriesToDelete: string[] = [];
    this.memoryCache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        entriesToDelete.push(key);
      }
    });
    entriesToDelete.forEach(key => this.memoryCache.delete(key));

    // IndexedDB cleanup
    if (!this.db) await this.initDB();
    if (this.db) {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (this.isExpired(cursor.value)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }
}

const cacheManager = new DataCacheManager();

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (fromCache = true): Promise<T | null> => {
    try {
      setError(null);

      // Try to get from cache first
      if (fromCache) {
        const cachedEntry = await cacheManager.get<T>(key);
        if (cachedEntry) {
          setData(cachedEntry.data);
          setLoading(false);
          
          // If stale-while-revalidate is enabled, fetch fresh data in background
          if (options.staleWhileRevalidate) {
            const age = Date.now() - cachedEntry.timestamp;
            const staleTime = (options.ttl || DEFAULT_TTL) * 0.8; // Consider stale at 80% of TTL
            
            if (age > staleTime) {
              setIsStale(true);
              // Fetch fresh data in background
              fetchData(false);
            }
          }
          
          return cachedEntry.data;
        }
      }

      // Fetch fresh data
      setLoading(true);
      const freshData = await fetcherRef.current();
      
      // Cache the fresh data
      await cacheManager.set(key, freshData, options);
      
      setData(freshData);
      setIsStale(false);
      return freshData;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [key, options]);

  const invalidate = useCallback(async () => {
    await cacheManager.delete(key);
    return fetchData(false);
  }, [key, fetchData]);

  const refresh = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup expired entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cacheManager.cleanup();
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    data,
    loading,
    error,
    isStale,
    refresh,
    invalidate,
    mutate: (newData: T) => {
      setData(newData);
      cacheManager.set(key, newData, options);
    },
  };
}

// HTTP Cache integration
export function useHttpCache<T>(
  url: string,
  fetchOptions: RequestInit = {},
  cacheOptions: CacheOptions = {}
) {
  const fetcher = useCallback(async (): Promise<T> => {
    // Try Cache API first for network requests
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      
      if (cachedResponse && cacheOptions.staleWhileRevalidate) {
        const cachedData = await cachedResponse.json();
        
        // Return cached data immediately, then fetch fresh data
        setTimeout(async () => {
          try {
            const response = await fetch(url, fetchOptions);
            if (response.ok) {
              const clonedResponse = response.clone();
              await cache.put(url, clonedResponse);
            }
          } catch (error) {
            console.warn('Background fetch failed:', error);
          }
        }, 0);
        
        return cachedData;
      }
    }

    // Fetch fresh data
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the response
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(url, response.clone());
      } catch (error) {
        console.warn('Failed to cache response:', error);
      }
    }

    return data;
  }, [url, fetchOptions]);

  return useDataCache<T>(`http-${url}`, fetcher, {
    ttl: 10 * 60 * 1000, // 10 minutes for HTTP requests
    persistToIndexedDB: true,
    staleWhileRevalidate: true,
    ...cacheOptions,
  });
}

// Cache utilities
export const CacheUtils = {
  // Clear all caches
  clearAll: async () => {
    await cacheManager.clear();
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  },

  // Get cache size
  getCacheSize: async (): Promise<{ memory: number; indexedDB: number; httpCache: number }> => {
    let indexedDBSize = 0;
    let httpCacheSize = 0;

    // Memory cache is harder to measure accurately
    const memorySize = 0; // Placeholder

    // IndexedDB size estimation
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      indexedDBSize = estimate.usage || 0;
    }

    // HTTP cache size estimation
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const requests = await cache.keys();
        httpCacheSize = requests.length * 1024; // Rough estimate
      } catch (error) {
        console.warn('Could not estimate cache size:', error);
      }
    }

    return { memory: memorySize, indexedDB: indexedDBSize, httpCache: httpCacheSize };
  },

  // Preload critical data
  preload: async (urls: string[], options: CacheOptions = {}) => {
    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok && typeof window !== 'undefined' && 'caches' in window) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to preload ${url}:`, error);
      }
    });

    await Promise.allSettled(promises);
  },
};