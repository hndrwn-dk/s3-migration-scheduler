import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import {
  DocumentTextIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { Migration } from '../types';
import { migrationService } from '../services/api';

interface LogsTabProps {
  migrations: Migration[];
}

const LogsTab: React.FC<LogsTabProps> = ({ migrations }) => {
  const [selectedMigration, setSelectedMigration] = useState<string>('');
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Check for pre-selected migration from Dashboard
  useEffect(() => {
    const preSelectedMigration = localStorage.getItem('selectedMigrationForLogs');
    if (preSelectedMigration && migrations.some(m => m.id === preSelectedMigration)) {
      setSelectedMigration(preSelectedMigration);
      localStorage.removeItem('selectedMigrationForLogs'); // Clean up after use
    }
  }, [migrations]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const loadLogs = useCallback(async (showToast = false) => {
    if (!selectedMigration) return;
    
    setLoading(true);
    try {
      const logsData = await migrationService.getMigrationLogs(selectedMigration);
      setLogs(logsData || 'No logs available yet...');
      setLastRefresh(new Date());
      if (showToast) {
        toast.success('Logs refreshed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('not found')) {
        setLogs('Migration not found or logs not yet available.');
      } else {
        setLogs(`Error loading logs: ${errorMessage}\n\nThis might be because:\n- The migration is still starting\n- The migration logs haven't been generated yet\n- There was a connection issue\n\nTry refreshing in a few moments.`);
      }
      if (showToast) {
        toast.error(`Failed to load logs: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMigration]);

  useEffect(() => {
    if (selectedMigration) {
      loadLogs();
      
      // Auto-refresh logs for active migrations
      const migration = migrations.find(m => m.id === selectedMigration);
      if (migration && (migration.status === 'running' || migration.status === 'reconciling' || migration.status === 'starting')) {
        const interval = setInterval(() => {
          loadLogs();
        }, 3000); // Increased to 3 seconds to reduce server load
        
        return () => clearInterval(interval);
      }
    }
  }, [selectedMigration, migrations, loadLogs]);

  // Reset logs when migration selection changes
  useEffect(() => {
    if (selectedMigration) {
      setLogs('');
      setLastRefresh(null);
    }
  }, [selectedMigration]);

  const copyLogsToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      toast.success('Logs copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy logs to clipboard');
    }
  };

  const downloadLogs = () => {
    const filename = `migration-${selectedMigration.slice(0, 8)}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.log`;
    
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Logs downloaded');
  };

  const formatLogLine = (line: string) => {
    if (!line.trim()) return { level: 'info', content: line };
    
    // Basic log level detection
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('error') || lowerLine.includes('failed') || lowerLine.includes('exception')) {
      return { level: 'error', content: line };
    } else if (lowerLine.includes('warning') || lowerLine.includes('warn')) {
      return { level: 'warning', content: line };
    } else {
      return { level: 'info', content: line };
    }
  };

  const getLogLineClass = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-yellow-700 bg-yellow-50';
      default:
        return 'text-gray-700';
    }
  };

  const filteredLogs = logs.split('\n').filter(line => {
    if (filterLevel === 'all') return true;
    const { level } = formatLogLine(line);
    return level === filterLevel;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      'running': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800',
      'reconciling': 'bg-purple-100 text-purple-800',
      'verified': 'bg-green-100 text-green-800'
    };
    
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const activeMigrations = migrations.filter(m => 
    m.config && m.id && (m.status === 'running' || m.status === 'reconciling' || m.status === 'starting')
  );
  const completedMigrations = migrations.filter(m => 
    m.config && m.id && (m.status === 'completed' || m.status === 'failed' || m.status === 'cancelled' || m.status === 'verified' || m.status === 'completed_with_differences')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Migration Logs</h2>
        <p className="text-gray-600 mt-2">View detailed logs and output from your migrations</p>
      </div>

      {/* Migration Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Migration</label>
            <select
              value={selectedMigration}
              onChange={(e) => setSelectedMigration(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Choose a migration to view logs...</option>
              
              {activeMigrations.length > 0 && (
                <optgroup label="Active Migrations">
                  {activeMigrations.map(migration => (
                    <option key={migration.id} value={migration.id}>
                      {migration.config?.source || 'Unknown'} → {migration.config?.destination || 'Unknown'} ({migration.status})
                    </option>
                  ))}
                </optgroup>
              )}
              
              {completedMigrations.length > 0 && (
                <optgroup label="Completed Migrations">
                  {completedMigrations.map(migration => (
                    <option key={migration.id} value={migration.id}>
                      {migration.config?.source || 'Unknown'} → {migration.config?.destination || 'Unknown'} ({migration.status})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {selectedMigration && (
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-600">
                {(() => {
                  const migration = migrations.find(m => m.id === selectedMigration);
                  return migration ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(migration.status)}`}>
                      {migration.status}
                    </span>
                  ) : null;
                })()}
              </div>
              
              <button
                onClick={() => loadLogs(true)}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <LoadingSpinner size="small" className="mr-2" />
                ) : (
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                )}
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logs Viewer */}
      {selectedMigration && (
        <div className="bg-white rounded-lg shadow">
          {/* Logs Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    Migration Logs
                  </h3>
                  {lastRefresh && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last updated: {format(lastRefresh, 'HH:mm:ss')}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <FunnelIcon className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as 'all' | 'error' | 'warning' | 'info')}
                    className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All Logs</option>
                    <option value="error">Errors Only</option>
                    <option value="warning">Warnings Only</option>
                    <option value="info">Info Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-scroll</span>
                </label>

                <button
                  onClick={copyLogsToClipboard}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ClipboardDocumentIcon className="w-4 h-4 mr-1" />
                  Copy
                </button>

                <button
                  onClick={downloadLogs}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>

          {/* Logs Content */}
          <div 
            ref={logsContainerRef}
            className="p-4 bg-gray-900 text-gray-100 font-mono text-sm overflow-auto"
            style={{ height: '500px' }}
          >
            {loading && (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner text="Loading logs..." />
              </div>
            )}
            
            {!loading && logs && (
              <div className="space-y-1">
                {filteredLogs.map((line, index) => {
                  const { level, content } = formatLogLine(line);
                  return (
                    <div
                      key={index}
                      className={`py-1 px-2 rounded ${level !== 'info' ? getLogLineClass(level) : ''}`}
                    >
                      <span className="select-all whitespace-pre-wrap break-all">
                        {content || '\u00A0'} {/* Non-breaking space for empty lines */}
                      </span>
                    </div>
                  );
                })}
                <div ref={logsEndRef} />
              </div>
            )}
            
            {!loading && !logs && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                  <p>No logs available for this migration</p>
                  <p className="text-sm mt-2">Logs will appear here once the migration starts</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Logs Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                {logs && (
                  <span>
                    {filteredLogs.length} lines 
                    {filterLevel !== 'all' && ` (filtered: ${filterLevel})`}
                  </span>
                )}
              </div>
              <div>
                {selectedMigration && (
                  <span>Migration ID: {selectedMigration.slice(0, 8)}...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Migration Selected */}
      {!selectedMigration && migrations.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-gray-500">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No migrations available</h3>
            <p>Start a migration to view logs here.</p>
          </div>
        </div>
      )}

      {!selectedMigration && migrations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-gray-500">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a migration</h3>
            <p>Choose a migration from the dropdown above to view its logs.</p>
          </div>
        </div>
      )}

      {/* Log Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Log Viewing Tips</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Real-time Updates:</strong> Logs for active migrations refresh automatically every 2 seconds</p>
          <p>• <strong>Filtering:</strong> Use the filter dropdown to show only errors, warnings, or all log entries</p>
          <p>• <strong>Auto-scroll:</strong> Enable auto-scroll to automatically follow new log entries</p>
          <p>• <strong>Copy & Download:</strong> Export logs for external analysis or troubleshooting</p>
          <p>• <strong>Error Highlighting:</strong> Error and warning messages are highlighted for easy identification</p>
        </div>
      </div>
    </div>
  );
};

export default LogsTab;