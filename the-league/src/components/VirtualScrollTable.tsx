import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import './VirtualScrollTable.css';

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface VirtualScrollTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  getRowKey?: (item: T, index: number) => string | number;
}

const VirtualScrollTable = memo(function VirtualScrollTable<T>({
  data,
  columns,
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5,
  className = '',
  onRowClick,
  getRowKey = (_, index) => index,
}: VirtualScrollTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(data.length, end + overscan),
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length]);

  const visibleItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push({
        index: i,
        item: data[i],
        key: getRowKey(data[i], i),
      });
    }
    return items;
  }, [data, visibleRange, getRowKey]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = data.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const renderCell = useCallback((column: Column<T>, item: T, index: number) => {
    if (column.render) {
      return column.render(item, index);
    }
    
    const value = (column.key in (item as object)) ? (item as any)[column.key] : '';
    return <span>{value}</span>;
  }, []);

  return (
    <div className={`virtual-scroll-table ${className}`}>
      <div className="virtual-table-header">
        <div className="virtual-table-row header-row">
          {columns.map((column, index) => (
            <div
              key={index}
              className="virtual-table-cell header-cell"
              style={{ width: column.width || 'auto' }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>
      
      <div
        ref={containerRef}
        className="virtual-table-body"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div
          className="virtual-table-spacer"
          style={{ height: totalHeight }}
        >
          <div
            className="virtual-table-content"
            style={{ transform: `translateY(${offsetY}px)` }}
          >
            {visibleItems.map(({ index, item, key }) => (
              <div
                key={key}
                className={`virtual-table-row data-row ${onRowClick ? 'clickable' : ''}`}
                style={{ height: itemHeight }}
                onClick={() => onRowClick?.(item, index)}
              >
                {columns.map((column, colIndex) => (
                  <div
                    key={colIndex}
                    className="virtual-table-cell data-cell"
                    style={{ width: column.width || 'auto' }}
                  >
                    {renderCell(column, item, index)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}) as <T>(props: VirtualScrollTableProps<T>) => React.ReactElement;

export default VirtualScrollTable;