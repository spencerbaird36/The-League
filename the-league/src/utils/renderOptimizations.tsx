import React, { memo, useMemo, useCallback, forwardRef, ComponentType, RefAttributes } from 'react';

// Higher-order component for automatic memoization
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `withMemo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Higher-order component for props optimization
export function withOptimizedProps<P extends object>(
  Component: ComponentType<P>,
  optimizations: {
    memoizeProps?: (keyof P)[];
    stableCallbacks?: (keyof P)[];
    computedProps?: { [K in keyof P]?: (props: P) => P[K] };
  } = {}
) {
  return memo(forwardRef<any, P>((props, ref) => {
    const { memoizeProps = [], stableCallbacks = [], computedProps = {} } = optimizations;

    // Memoize specified props
    const memoizedValues = useMemo(() => {
      const memo: any = {};
      memoizeProps.forEach(key => {
        memo[key] = (props as any)[key];
      });
      return memo;
    }, memoizeProps.map(key => (props as any)[key]));

    // Create stable callbacks for specified props
    const stableCallbackValues = useMemo(() => {
      const callbacks: any = {};
      stableCallbacks.forEach(key => {
        if (typeof (props as any)[key] === 'function') {
          callbacks[key] = useCallback((props as any)[key], [(props as any)[key]]);
        }
      });
      return callbacks;
    }, stableCallbacks.map(key => (props as any)[key]));

    // Compute derived props
    const computedValues = useMemo(() => {
      const computed: any = {};
      Object.entries(computedProps).forEach(([key, computeFn]) => {
        if (computeFn && typeof computeFn === 'function') {
          computed[key] = (computeFn as any)(props);
        }
      });
      return computed;
    }, [props]);

    // Combine all optimized props
    const optimizedProps = useMemo(() => ({
      ...props,
      ...memoizedValues,
      ...stableCallbackValues,
      ...computedValues,
    }), [props, memoizedValues, stableCallbackValues, computedValues]);

    return <Component ref={ref} {...optimizedProps} />;
  }));
}

// Utility for creating stable callback arrays
export function useStableCallbacks<T extends Record<string, (...args: any[]) => any>>(
  callbacks: T
): T {
  return useMemo(() => {
    const stableCallbacks = {} as any;
    Object.keys(callbacks).forEach(key => {
      stableCallbacks[key] = useCallback(callbacks[key], [callbacks[key]]);
    });
    return stableCallbacks;
  }, Object.values(callbacks));
}

// Utility for creating stable objects
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}

// Utility for creating stable arrays
export function useStableArray<T>(arr: T[]): T[] {
  return useMemo(() => arr, arr);
}

// Component for preventing unnecessary re-renders of children
export const RenderBarrier: React.FC<{
  children: React.ReactNode;
  shouldRender?: boolean;
  fallback?: React.ReactNode;
}> = memo(({ children, shouldRender = true, fallback = null }) => {
  return shouldRender ? <>{children}</> : <>{fallback}</>;
});

// Hook for debounced renders
export function useRenderDebounce(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook for throttled renders
export function useRenderThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = React.useRef(Date.now());

  React.useEffect(() => {
    if (Date.now() - lastRan.current >= limit) {
      setThrottledValue(value);
      lastRan.current = Date.now();
    } else {
      const timeout = setTimeout(() => {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }, limit - (Date.now() - lastRan.current));

      return () => clearTimeout(timeout);
    }
  }, [value, limit]);

  return throttledValue;
}

// React DevTools performance markers
export function markRenderStart(componentName: string) {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    performance.mark(`${componentName}-render-start`);
  }
}

export function markRenderEnd(componentName: string) {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    performance.mark(`${componentName}-render-end`);
    performance.measure(
      `${componentName}-render`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );
  }
}

// Optimized list renderer for large datasets
export const OptimizedList = memo(<T,>({
  items,
  renderItem,
  keyExtractor,
  itemHeight,
  maxVisible = 50,
  className = '',
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  itemHeight?: number;
  maxVisible?: number;
  className?: string;
}) => {
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: maxVisible });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current || !itemHeight) return;

    const scrollTop = containerRef.current.scrollTop;
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(items.length, start + maxVisible);

    setVisibleRange({ start, end });
  }, [itemHeight, maxVisible, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      originalIndex: visibleRange.start + index,
      key: keyExtractor(item, visibleRange.start + index),
    }));
  }, [items, visibleRange, keyExtractor]);

  const totalHeight = items.length * (itemHeight || 0);
  const offsetY = visibleRange.start * (itemHeight || 0);

  return (
    <div 
      ref={containerRef}
      className={`optimized-list ${className}`}
      onScroll={itemHeight ? handleScroll : undefined}
      style={{ 
        height: itemHeight ? Math.min(totalHeight, maxVisible * itemHeight) : 'auto',
        overflowY: itemHeight ? 'auto' : 'visible'
      }}
    >
      {itemHeight ? (
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map(({ item, originalIndex, key }) => (
              <div key={key} style={{ height: itemHeight }}>
                {renderItem(item, originalIndex)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {items.map((item, index) => (
            <div key={keyExtractor(item, index)}>
              {renderItem(item, index)}
            </div>
          ))}
        </>
      )}
    </div>
  );
});

// Performance monitoring wrapper - simplified
export function withPerformanceMonitoring<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  return memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Anonymous';
    
    React.useEffect(() => {
      markRenderStart(name);
      return () => markRenderEnd(name);
    });

    return <Component {...props} />;
  });
}

// Optimized context consumers
export function createOptimizedContext<T>() {
  const Context = React.createContext<T | undefined>(undefined);
  
  const Provider = ({ value, children }: { value: T; children: React.ReactNode }) => {
    const memoizedValue = useMemo(() => value, [JSON.stringify(value)]);
    return <Context.Provider value={memoizedValue}>{children}</Context.Provider>;
  };

  const useOptimizedContext = () => {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error('useOptimizedContext must be used within a Provider');
    }
    return context;
  };

  return { Provider, useOptimizedContext };
}

// CSS-in-JS optimization
export function useOptimizedStyles<T extends Record<string, React.CSSProperties>>(
  styles: T,
  dependencies: any[] = []
): T {
  return useMemo(() => styles, dependencies);
}