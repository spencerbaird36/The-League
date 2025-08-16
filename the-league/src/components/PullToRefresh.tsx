import React, { useState, useRef, useEffect } from 'react';
import './PullToRefresh.css';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: TouchEvent) => {
    // Only trigger if at the top of the page
    if (window.scrollY === 0) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, (currentY - startY) * 0.5); // Reduce sensitivity

    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault(); // Prevent native scroll behavior
      setPullDistance(Math.min(distance, threshold * 1.5)); // Cap the distance
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Lock at threshold during refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Animate back to 0
      const animateBack = () => {
        setPullDistance(prev => {
          const newDistance = prev * 0.8;
          if (newDistance < 1) {
            return 0;
          }
          requestAnimationFrame(animateBack);
          return newDistance;
        });
      };
      animateBack();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add passive: false to allow preventDefault
    const touchStartOptions = { passive: false };
    const touchMoveOptions = { passive: false };

    container.addEventListener('touchstart', handleTouchStart, touchStartOptions);
    container.addEventListener('touchmove', handleTouchMove, touchMoveOptions);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, startY, threshold, isRefreshing]);

  const getRefreshStatus = () => {
    if (isRefreshing) return 'Refreshing...';
    if (pullDistance >= threshold) return 'Release to refresh';
    if (pullDistance > 0) return 'Pull to refresh';
    return '';
  };

  const getRefreshIcon = () => {
    if (isRefreshing) return '🔄';
    if (pullDistance >= threshold) return '⬆️';
    return '⬇️';
  };

  return (
    <div 
      ref={containerRef}
      className={`pull-to-refresh-container ${className}`}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div 
        className={`pull-to-refresh-indicator ${pullDistance > 0 ? 'visible' : ''} ${isRefreshing ? 'refreshing' : ''}`}
        style={{
          opacity: Math.min(pullDistance / threshold, 1),
          transform: `translateY(${-50 + (pullDistance / threshold) * 50}px) rotate(${isRefreshing ? '360deg' : pullDistance >= threshold ? '180deg' : `${(pullDistance / threshold) * 180}deg`})`
        }}
      >
        <div className="refresh-icon">
          {getRefreshIcon()}
        </div>
        <div className="refresh-text">
          {getRefreshStatus()}
        </div>
      </div>
      
      <div className="pull-to-refresh-content">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;