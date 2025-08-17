import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest } from '../config/api';

// Request deduplication and caching
class APIRequestManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private abortControllers = new Map<string, AbortController>();

  // Generate cache key from URL and options
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  // Check if cached data is still valid
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.requestCache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < cached.ttl;
  }

  // Deduplicated API request
  async request<T>(
    url: string, 
    options: RequestInit = {}, 
    cacheOptions: { ttl?: number; dedupe?: boolean } = {}
  ): Promise<T> {
    const { ttl = 30000, dedupe = true } = cacheOptions; // 30 seconds default TTL
    const cacheKey = this.getCacheKey(url, options);

    // Return cached data if valid
    if (this.isCacheValid(cacheKey)) {
      return this.requestCache.get(cacheKey)!.data;
    }

    // Return existing pending request if deduplication is enabled
    if (dedupe && this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create abort controller for request cancellation
    const abortController = new AbortController();
    this.abortControllers.set(cacheKey, abortController);

    // Create new request
    const requestPromise = apiRequest(url, {
      ...options,
      signal: abortController.signal,
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Cache successful response
      this.requestCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
      });

      return data;
    }).catch((error) => {
      // Don't cache errors, but clean up
      this.requestCache.delete(cacheKey);
      throw error;
    }).finally(() => {
      // Clean up tracking
      this.pendingRequests.delete(cacheKey);
      this.abortControllers.delete(cacheKey);
    });

    // Track pending request
    if (dedupe) {
      this.pendingRequests.set(cacheKey, requestPromise);
    }

    return requestPromise;
  }

  // Cancel specific request
  cancelRequest(url: string, options?: RequestInit): void {
    const cacheKey = this.getCacheKey(url, options);
    const controller = this.abortControllers.get(cacheKey);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(cacheKey);
      this.pendingRequests.delete(cacheKey);
    }
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
    this.pendingRequests.clear();
  }

  // Clear cache
  clearCache(): void {
    this.requestCache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size,
      activeControllers: this.abortControllers.size,
    };
  }

  // Invalidate specific cache entry
  invalidate(url: string, options?: RequestInit): void {
    const cacheKey = this.getCacheKey(url, options);
    this.requestCache.delete(cacheKey);
  }

  // Preload data
  async preload<T>(url: string, options?: RequestInit): Promise<void> {
    try {
      await this.request<T>(url, options, { ttl: 60000 }); // 1 minute cache for preloaded data
    } catch (error) {
      console.warn('Preload failed:', url, error);
    }
  }
}

const apiManager = new APIRequestManager();

// Hook for optimized API requests
export function useOptimizedAPI<T>(
  url: string | null,
  options: RequestInit = {},
  hookOptions: {
    ttl?: number;
    enabled?: boolean;
    dedupe?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const {
    ttl = 30000,
    enabled = true,
    dedupe = true,
    onSuccess,
    onError,
  } = hookOptions;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiManager.request<T>(url, options, { ttl, dedupe });
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        setError(error);
        onErrorRef.current?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [url, enabled, ttl, dedupe, JSON.stringify(options)]);

  // Refetch function
  const refetch = useCallback(() => {
    if (url) {
      apiManager.invalidate(url, options);
      return fetchData();
    }
  }, [url, fetchData, JSON.stringify(options)]);

  // Mutate function for optimistic updates
  const mutate = useCallback((newData: T | ((prevData: T | null) => T)) => {
    setData(prevData => 
      typeof newData === 'function' 
        ? (newData as (prevData: T | null) => T)(prevData)
        : newData
    );
  }, []);

  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      if (url) {
        apiManager.cancelRequest(url, options);
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    mutate,
  };
}

// Hook for mutations with optimistic updates
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    onSettled?: (data: TData | undefined, error: Error | undefined, variables: TVariables) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { onSuccess, onError, onSettled } = options;

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    setLoading(true);
    setError(null);

    try {
      const data = await mutationFn(variables);
      onSuccess?.(data, variables);
      onSettled?.(data, undefined, variables);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error, variables);
      onSettled?.(undefined, error, variables);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError, onSettled]);

  return {
    mutate,
    loading,
    error,
  };
}

// Batch multiple requests
export function useBatchRequests<T extends Record<string, any>>(
  requests: Array<{ key: string; url: string; options?: RequestInit }>,
  enabled = true
) {
  const [data, setData] = useState<Partial<T>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, Error>>({});

  const fetchBatch = useCallback(async () => {
    if (!enabled || requests.length === 0) return;

    setLoading(true);
    const results: Partial<T> = {};
    const batchErrors: Record<string, Error> = {};

    // Execute all requests in parallel
    const promises = requests.map(async ({ key, url, options }) => {
      try {
        const result = await apiManager.request(url, options);
        (results as any)[key] = result;
      } catch (error) {
        batchErrors[key] = error as Error;
      }
    });

    await Promise.allSettled(promises);

    setData(results);
    setErrors(batchErrors);
    setLoading(false);
  }, [requests, enabled]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  return {
    data,
    loading,
    errors,
    refetch: fetchBatch,
  };
}

// Export the API manager for direct use
export { apiManager };

// Utility functions
export const APIUtils = {
  // Preload critical data
  preloadCritical: async (urls: string[]) => {
    const promises = urls.map(url => apiManager.preload(url));
    await Promise.allSettled(promises);
  },

  // Clear all caches and pending requests
  reset: () => {
    apiManager.cancelAllRequests();
    apiManager.clearCache();
  },

  // Get performance stats
  getStats: () => apiManager.getCacheStats(),

  // Invalidate specific cache patterns
  invalidatePattern: (pattern: string) => {
    // This would require extending the cache manager to support pattern matching
    console.warn('Pattern invalidation not yet implemented');
  },
};