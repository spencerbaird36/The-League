import React from 'react';
import './LoadingSkeleton.css';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'list' | 'text' | 'avatar' | 'button';
  rows?: number;
  className?: string;
  height?: string;
  width?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type = 'text',
  rows = 1,
  className = '',
  height,
  width
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-card-header">
              <div className="skeleton skeleton-avatar"></div>
              <div className="skeleton-card-title">
                <div className="skeleton skeleton-text skeleton-title"></div>
                <div className="skeleton skeleton-text skeleton-subtitle"></div>
              </div>
            </div>
            <div className="skeleton-card-content">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="skeleton skeleton-text"></div>
              ))}
            </div>
            <div className="skeleton-card-footer">
              <div className="skeleton skeleton-button"></div>
              <div className="skeleton skeleton-button"></div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="skeleton-table">
            <div className="skeleton-table-header">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="skeleton skeleton-text skeleton-header"></div>
              ))}
            </div>
            {Array(rows).fill(0).map((_, i) => (
              <div key={i} className="skeleton-table-row">
                {Array(4).fill(0).map((_, j) => (
                  <div key={j} className="skeleton skeleton-text"></div>
                ))}
              </div>
            ))}
          </div>
        );

      case 'list':
        return (
          <div className="skeleton-list">
            {Array(rows).fill(0).map((_, i) => (
              <div key={i} className="skeleton-list-item">
                <div className="skeleton skeleton-avatar skeleton-small"></div>
                <div className="skeleton-list-content">
                  <div className="skeleton skeleton-text skeleton-title"></div>
                  <div className="skeleton skeleton-text skeleton-subtitle"></div>
                </div>
                <div className="skeleton skeleton-text skeleton-badge"></div>
              </div>
            ))}
          </div>
        );

      case 'avatar':
        return <div className="skeleton skeleton-avatar"></div>;

      case 'button':
        return <div className="skeleton skeleton-button"></div>;

      case 'text':
      default:
        return (
          <div className="skeleton-text-block">
            {Array(rows).fill(0).map((_, i) => (
              <div 
                key={i} 
                className={`skeleton skeleton-text ${i === rows - 1 ? 'skeleton-text-last' : ''}`}
              ></div>
            ))}
          </div>
        );
    }
  };

  return (
    <div 
      className={`loading-skeleton ${className}`}
      style={{ height, width }}
    >
      {renderSkeleton()}
    </div>
  );
};

export default LoadingSkeleton;