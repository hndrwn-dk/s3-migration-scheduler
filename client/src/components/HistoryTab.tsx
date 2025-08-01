import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  StopIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Migration } from '../types';
import { migrationService } from '../services/api';

interface HistoryTabProps {
  migrations: Migration[];
  onCancel: (migrationId: string) => void;
}

const HistoryTab: React.FC<HistoryTabProps> = ({ migrations, onCancel }) => {
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'startTime' | 'status' | 'progress'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh from storage first, then get updated data
      const refreshResult = await migrationService.refreshMigrations();
      console.log('Refresh result:', refreshResult);
      toast.success(refreshResult.message);
    } catch (error) {
      toast.error(`Failed to refresh migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredMigrations = migrations.filter(migration => {
    // Filter out migrations with incomplete data
    if (!migration.id) {
      console.warn('Skipping migration with missing ID:', migration);
      return false;
    }
    
    // Ensure config exists or create a minimal one for display
    if (!migration.config) {
      console.warn('Migration missing config, creating minimal config:', migration.id);
      migration.config = {
        source: 'Unknown',
        destination: 'Unknown',
        options: {
          overwrite: false,
          remove: false,
          exclude: [],
          preserve: false,
          retry: false,
          dryRun: false,
          watch: false
        }
      };
    }
    
    if (filter === 'all') return true;
    return migration.status === filter;
  });

  const sortedMigrations = [...filteredMigrations].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'startTime':
        comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
      case 'progress':
        comparison = a.progress - b.progress;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'running':
      case 'reconciling':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <StopIcon className="w-5 h-5 text-gray-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
      case 'reconciling':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Migration History</h2>
        <p className="text-gray-600 mt-2">View and manage your S3 bucket migrations</p>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Filter by Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'startTime' | 'status' | 'progress')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="startTime">Start Time</option>
                <option value="status">Status</option>
                <option value="progress">Progress</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing {sortedMigrations.length} of {migrations.length} migrations
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Migrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sortedMigrations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Migration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMigrations.map((migration) => (
                  <tr key={migration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {migration.config?.source || 'Unknown'} → {migration.config?.destination || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {migration.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(migration.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(migration.status)}`}>
                          {migration.status === 'verified' ? 'completed & verified' : migration.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${migration.progress}%` }}
                          ></div>
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{migration.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {format(new Date(migration.startTime), 'MMM dd, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(migration.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        <div>{formatBytes(migration.stats.transferredSize)}</div>
                        <div className="text-xs text-gray-500">
                          {migration.stats.transferredObjects.toLocaleString()} objects
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedMigration(migration)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {(migration.status === 'running' || migration.status === 'reconciling') && (
                          <button
                            onClick={() => onCancel(migration.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <StopIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No migrations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'all' 
                ? 'No migrations have been started yet.'
                : `No migrations with status "${filter}" found.`
              }
            </p>
          </div>
        )}
      </div>

      {/* Migration Details Modal */}
      {selectedMigration && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Migration Details</h3>
              <button
                onClick={() => setSelectedMigration(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Migration ID</h4>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedMigration.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedMigration.status)}
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMigration.status)}`}>
                      {selectedMigration.status}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Source</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedMigration.config?.source || 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Destination</h4>
                                      <p className="mt-1 text-sm text-gray-900">{selectedMigration.config?.destination || 'Unknown'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Started</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(selectedMigration.startTime), 'PPpp')}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                  <p className="mt-1 text-sm text-gray-900">{formatDuration(selectedMigration.duration)}</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Progress</h4>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                      style={{ width: `${selectedMigration.progress}%` }}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-900">{selectedMigration.progress}%</span>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Statistics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-blue-600">Objects Transferred</p>
                    <p className="text-lg font-bold text-blue-900">
                      {selectedMigration.stats.transferredObjects.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-green-600">Data Transferred</p>
                    <p className="text-lg font-bold text-green-900">
                      {formatBytes(selectedMigration.stats.transferredSize)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-purple-600">Average Speed</p>
                    <p className="text-lg font-bold text-purple-900">
                      {formatBytes(selectedMigration.stats.speed)}/s
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-600">Total Objects</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedMigration.stats.totalObjects.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Configuration</h4>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {selectedMigration.config.options.overwrite && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Overwrite enabled
                      </span>
                    )}
                    {selectedMigration.config.options.remove && (
                      <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Remove enabled
                      </span>
                    )}
                    {selectedMigration.config.options.exclude.length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {selectedMigration.config.options.exclude.length} exclusion patterns
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Errors */}
              {selectedMigration.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                      {selectedMigration.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Reconciliation */}
              {selectedMigration.reconciliation && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Data Reconciliation</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedMigration.reconciliation.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : selectedMigration.reconciliation.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedMigration.reconciliation.status}
                      </span>
                      {selectedMigration.reconciliation.differences && selectedMigration.reconciliation.differences.length === 0 ? (
                        <span className="text-sm text-green-600">✓ No differences found</span>
                      ) : selectedMigration.reconciliation.differences ? (
                        <span className="text-sm text-yellow-600">
                          ⚠ {selectedMigration.reconciliation.differences.length} differences found
                        </span>
                      ) : null}
                    </div>

                    {/* Bucket Statistics Comparison */}
                    {selectedMigration.reconciliation.sourceStats && selectedMigration.reconciliation.destStats && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">Source Bucket</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Objects:</span>
                              <span className="font-mono">{selectedMigration.reconciliation.sourceStats.objectCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-mono">{(selectedMigration.reconciliation.sourceStats.totalSize / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="font-medium text-gray-700">Destination Bucket</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Objects:</span>
                              <span className="font-mono">{selectedMigration.reconciliation.destStats.objectCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span className="font-mono">{(selectedMigration.reconciliation.destStats.totalSize / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Verification Results */}
                    {selectedMigration.reconciliation.summary && (
                      <div className="border-t pt-2 space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                          <span>Object Count Match:</span>
                          <span className={selectedMigration.reconciliation.summary.objectCountMatch ? 'text-green-600' : 'text-red-600'}>
                            {selectedMigration.reconciliation.summary.objectCountMatch ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Total Size Match:</span>
                          <span className={selectedMigration.reconciliation.summary.totalSizeMatch ? 'text-green-600' : 'text-red-600'}>
                            {selectedMigration.reconciliation.summary.totalSizeMatch ? '✓ Yes' : '✗ No'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Overall Status:</span>
                          <span className={
                            selectedMigration.reconciliation.summary.objectCountMatch && 
                            selectedMigration.reconciliation.summary.totalSizeMatch && 
                            !selectedMigration.reconciliation.summary.differencesFound 
                              ? 'text-green-600 font-medium' 
                              : 'text-yellow-600 font-medium'
                          }>
                            {selectedMigration.reconciliation.summary.objectCountMatch && 
                             selectedMigration.reconciliation.summary.totalSizeMatch && 
                             !selectedMigration.reconciliation.summary.differencesFound 
                               ? '✅ Migration Verified' 
                               : '⚠ Needs Review'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;