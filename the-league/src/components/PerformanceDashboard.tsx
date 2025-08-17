import React, { useState, useEffect } from 'react';
import { PerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { CacheUtils } from '../hooks/useDataCache';
import './PerformanceDashboard.css';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isOpen, onClose }) => {
  const [performanceReport, setPerformanceReport] = useState<any[]>([]);
  const [cacheSize, setCacheSize] = useState({ memory: 0, indexedDB: 0, httpCache: 0 });
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const updateData = async () => {
      // Performance report
      const report = PerformanceMonitor.generateReport();
      setPerformanceReport(report);

      // Cache size
      const size = await CacheUtils.getCacheSize();
      setCacheSize(size);

      // Memory info
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
          total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2),
          limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2),
          usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2),
        });
      }
    };

    updateData();
    const interval = setInterval(updateData, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isOpen, refreshKey]);

  const handleClearMetrics = () => {
    PerformanceMonitor.clearMetrics();
    setRefreshKey(prev => prev + 1);
  };

  const handleClearCache = async () => {
    await CacheUtils.clearAll();
    setRefreshKey(prev => prev + 1);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="performance-dashboard-overlay">
      <div className="performance-dashboard">
        <div className="dashboard-header">
          <h2>Performance Dashboard</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="dashboard-content">
          {/* Memory Usage */}
          {memoryInfo && (
            <div className="dashboard-section">
              <h3>Memory Usage</h3>
              <div className="memory-info">
                <div className="memory-stat">
                  <span className="label">Used:</span>
                  <span className="value">{memoryInfo.used} MB</span>
                </div>
                <div className="memory-stat">
                  <span className="label">Total:</span>
                  <span className="value">{memoryInfo.total} MB</span>
                </div>
                <div className="memory-stat">
                  <span className="label">Limit:</span>
                  <span className="value">{memoryInfo.limit} MB</span>
                </div>
                <div className="memory-stat">
                  <span className="label">Usage:</span>
                  <span className={`value ${parseFloat(memoryInfo.usage) > 80 ? 'warning' : ''}`}>
                    {memoryInfo.usage}%
                  </span>
                </div>
              </div>
              <div className="memory-bar">
                <div 
                  className="memory-used" 
                  style={{ width: `${memoryInfo.usage}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Cache Information */}
          <div className="dashboard-section">
            <h3>Cache Usage</h3>
            <div className="cache-info">
              <div className="cache-stat">
                <span className="label">IndexedDB:</span>
                <span className="value">{formatBytes(cacheSize.indexedDB)}</span>
              </div>
              <div className="cache-stat">
                <span className="label">HTTP Cache:</span>
                <span className="value">{formatBytes(cacheSize.httpCache)}</span>
              </div>
            </div>
            <button onClick={handleClearCache} className="action-btn">
              Clear All Caches
            </button>
          </div>

          {/* Component Performance */}
          <div className="dashboard-section">
            <h3>Component Performance</h3>
            {performanceReport.length === 0 ? (
              <p>No performance data available</p>
            ) : (
              <div className="performance-table">
                <table>
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Renders</th>
                      <th>Avg Time (ms)</th>
                      <th>Max Time (ms)</th>
                      <th>Slow Renders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceReport.map((component, index) => (
                      <tr key={index}>
                        <td>{component.componentName}</td>
                        <td>{component.totalRenders}</td>
                        <td className={component.avgRenderTime > 16 ? 'warning' : ''}>
                          {component.avgRenderTime}
                        </td>
                        <td className={component.maxRenderTime > 50 ? 'error' : component.maxRenderTime > 16 ? 'warning' : ''}>
                          {component.maxRenderTime}
                        </td>
                        <td className={component.slowRenders > 0 ? 'warning' : ''}>
                          {component.slowRenders}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={handleClearMetrics} className="action-btn">
              Clear Metrics
            </button>
          </div>

          {/* Performance Tips */}
          <div className="dashboard-section">
            <h3>Performance Tips</h3>
            <div className="tips">
              <div className="tip">
                <strong>Target:</strong> Keep render times under 16ms for 60fps
              </div>
              <div className="tip">
                <strong>Memory:</strong> Watch for memory usage above 80%
              </div>
              <div className="tip">
                <strong>Cache:</strong> Use caching for frequently accessed data
              </div>
            </div>
          </div>

          {/* Development Tools */}
          <div className="dashboard-section">
            <h3>Development Tools</h3>
            <div className="dev-tools">
              <button 
                onClick={() => console.log(PerformanceMonitor.getAllMetrics())} 
                className="action-btn"
              >
                Log All Metrics
              </button>
              <button 
                onClick={() => {
                  if ('gc' in window) {
                    (window as any).gc();
                    console.log('Garbage collection triggered');
                  } else {
                    console.log('Garbage collection not available');
                  }
                }} 
                className="action-btn"
              >
                Force GC
              </button>
              <button 
                onClick={() => {
                  PerformanceMonitor.measureWebVitals();
                  console.log('Web vitals measurement started');
                }} 
                className="action-btn"
              >
                Measure Web Vitals
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;