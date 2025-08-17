import React, { memo, useCallback, useMemo } from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  maxVisiblePages?: number;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = memo(({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  maxVisiblePages = 7,
  className = '',
}) => {
  const visiblePages = useMemo(() => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination logic
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let start = Math.max(1, currentPage - halfVisible);
      let end = Math.min(totalPages, currentPage + halfVisible);
      
      // Adjust if we're near the beginning or end
      if (currentPage <= halfVisible) {
        end = Math.min(totalPages, maxVisiblePages);
      }
      if (currentPage > totalPages - halfVisible) {
        start = Math.max(1, totalPages - maxVisiblePages + 1);
      }
      
      // Add first page and ellipsis if needed
      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }
      
      // Add visible pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if needed
      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  }, [currentPage, totalPages, maxVisiblePages]);

  const handlePageClick = useCallback((page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePrevious = useCallback(() => {
    handlePageClick(currentPage - 1);
  }, [currentPage, handlePageClick]);

  const handleNext = useCallback(() => {
    handlePageClick(currentPage + 1);
  }, [currentPage, handlePageClick]);

  const handleFirst = useCallback(() => {
    handlePageClick(1);
  }, [handlePageClick]);

  const handleLast = useCallback(() => {
    handlePageClick(totalPages);
  }, [totalPages, handlePageClick]);

  if (totalPages <= 1) return null;

  return (
    <div className={`pagination ${className}`}>
      {showFirstLast && currentPage > 1 && (
        <button
          className="pagination-btn first"
          onClick={handleFirst}
          title="First page"
        >
          <span className="pagination-icon">⟪</span>
        </button>
      )}
      
      {currentPage > 1 && (
        <button
          className="pagination-btn prev"
          onClick={handlePrevious}
          title="Previous page"
        >
          <span className="pagination-icon">⟨</span>
        </button>
      )}

      <div className="pagination-pages">
        {visiblePages.map((page, index) => (
          <React.Fragment key={index}>
            {typeof page === 'number' ? (
              <button
                className={`pagination-btn page ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageClick(page)}
              >
                {page}
              </button>
            ) : (
              <span className="pagination-ellipsis">{page}</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {currentPage < totalPages && (
        <button
          className="pagination-btn next"
          onClick={handleNext}
          title="Next page"
        >
          <span className="pagination-icon">⟩</span>
        </button>
      )}
      
      {showFirstLast && currentPage < totalPages && (
        <button
          className="pagination-btn last"
          onClick={handleLast}
          title="Last page"
        >
          <span className="pagination-icon">⟫</span>
        </button>
      )}
    </div>
  );
});

export default Pagination;