import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

interface PerformanceMonitorOptions {
  componentName: string;
  enableMemoryTracking?: boolean;
  logThreshold?: number; // ms
  onPerformanceIssue?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor({
  componentName,
  enableMemoryTracking = false,
  logThreshold = 16, // 16ms = 60fps
  onPerformanceIssue,
}: PerformanceMonitorOptions) {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Start measuring render time
  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
  }, []);

  // End measuring render time
  const endMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    let memoryUsage: number | undefined;
    if (enableMemoryTracking && 'memory' in performance) {
      memoryUsage = (performance as any).memory?.usedJSHeapSize;
    }

    const metrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      componentName,
      timestamp: Date.now(),
    };

    // Log performance issues
    if (renderTime > logThreshold) {
      console.warn(`🐌 Slow render detected in ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
        memoryUsage: memoryUsage ? `${(memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      });

      onPerformanceIssue?.(metrics);
    }

    // Store metrics for potential analysis
    if (typeof window !== 'undefined') {
      const existingMetrics = JSON.parse(
        sessionStorage.getItem('performanceMetrics') || '[]'
      );
      existingMetrics.push(metrics);
      
      // Keep only last 100 metrics to prevent memory issues
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      
      sessionStorage.setItem('performanceMetrics', JSON.stringify(existingMetrics));
    }
  }, [componentName, enableMemoryTracking, logThreshold, onPerformanceIssue]);

  // Track mount time
  useEffect(() => {
    mountTime.current = performance.now();
    
    return () => {
      const unmountTime = performance.now() - mountTime.current;
      console.log(`📊 ${componentName} was mounted for ${unmountTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  // Measure every render
  useEffect(() => {
    endMeasurement();
  });

  // Start measurement on every render
  startMeasurement();

  // Memory leak detection
  const detectMemoryLeaks = useCallback(() => {
    if (!enableMemoryTracking || !('memory' in performance)) return null;

    const memory = (performance as any).memory;
    const memoryInfo = {
      used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
      limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
      usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2),
    };

    // Warning if memory usage is high
    if (parseFloat(memoryInfo.usage) > 80) {
      console.warn(`🚨 High memory usage detected in ${componentName}:`, memoryInfo);
    }

    return memoryInfo;
  }, [componentName, enableMemoryTracking]);

  // Performance analytics
  const getPerformanceReport = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const metrics = JSON.parse(
      sessionStorage.getItem('performanceMetrics') || '[]'
    ) as PerformanceMetrics[];

    const componentMetrics = metrics.filter(m => m.componentName === componentName);
    
    if (componentMetrics.length === 0) return null;

    const renderTimes = componentMetrics.map(m => m.renderTime);
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);
    const minRenderTime = Math.min(...renderTimes);

    return {
      componentName,
      totalRenders: componentMetrics.length,
      avgRenderTime: parseFloat(avgRenderTime.toFixed(2)),
      maxRenderTime: parseFloat(maxRenderTime.toFixed(2)),
      minRenderTime: parseFloat(minRenderTime.toFixed(2)),
      slowRenders: componentMetrics.filter(m => m.renderTime > logThreshold).length,
    };
  }, [componentName, logThreshold]);

  return {
    detectMemoryLeaks,
    getPerformanceReport,
    renderCount: renderCount.current,
  };
}

// Global performance monitoring utilities
export const PerformanceMonitor = {
  // Clear all stored metrics
  clearMetrics: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('performanceMetrics');
    }
  },

  // Get all performance metrics
  getAllMetrics: (): PerformanceMetrics[] => {
    if (typeof window === 'undefined') return [];
    return JSON.parse(sessionStorage.getItem('performanceMetrics') || '[]');
  },

  // Get component-specific metrics
  getComponentMetrics: (componentName: string): PerformanceMetrics[] => {
    return PerformanceMonitor.getAllMetrics().filter(
      m => m.componentName === componentName
    );
  },

  // Generate performance report for all components
  generateReport: () => {
    const allMetrics = PerformanceMonitor.getAllMetrics();
    const componentNamesSet = new Set(allMetrics.map(m => m.componentName));
    const componentNames = Array.from(componentNamesSet);
    
    return componentNames.map(name => {
      const metrics = allMetrics.filter(m => m.componentName === name);
      const renderTimes = metrics.map(m => m.renderTime);
      const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      
      return {
        componentName: name,
        totalRenders: metrics.length,
        avgRenderTime: parseFloat(avgRenderTime.toFixed(2)),
        maxRenderTime: Math.max(...renderTimes),
        slowRenders: metrics.filter(m => m.renderTime > 16).length,
      };
    });
  },

  // Monitor Core Web Vitals
  measureWebVitals: () => {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('📈 LCP:', entry.startTime);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('Performance observer not supported');
    }

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('📊 CLS:', clsValue);
    });

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('Layout shift observer not supported');
    }
  },
};