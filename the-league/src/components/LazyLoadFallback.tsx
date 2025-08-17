import React from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import './LazyLoadFallback.css';

interface LazyLoadFallbackProps {
  type?: 'page' | 'modal' | 'component';
}

const LazyLoadFallback: React.FC<LazyLoadFallbackProps> = ({ type = 'page' }) => {
  if (type === 'modal') {
    return (
      <div className="lazy-fallback modal-fallback">
        <div className="modal-skeleton">
          <LoadingSkeleton type="card" />
        </div>
      </div>
    );
  }

  if (type === 'component') {
    return (
      <div className="lazy-fallback component-fallback">
        <LoadingSkeleton type="list" rows={3} />
      </div>
    );
  }

  // Default page fallback
  return (
    <div className="lazy-fallback page-fallback">
      <div className="page-skeleton">
        <div className="skeleton-header">
          <div className="skeleton skeleton-text skeleton-title"></div>
          <div className="skeleton skeleton-text skeleton-subtitle"></div>
        </div>
        <div className="skeleton-content">
          <div className="skeleton-grid">
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="list" rows={4} />
            <LoadingSkeleton type="table" rows={5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LazyLoadFallback;