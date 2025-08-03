import React, { useMemo, useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import { Migration, TabType } from '../types';
import { migrationService } from '../services/api';

interface DashboardProps {
  migrations: Migration[];
  onTabChange?: (tab: TabType) => void;
}

interface SystemStats {
  total: number;
  completed: number;
  running: number;
  failed: number;
  cancelled: number;
  scheduled?: number; // Optional for backward compatibility
  pending?: number;
  recent_activity: number;
  total_data_transferred: number;
  average_speed: number;
  success_rate: number;
  completed_with_differences: number;
}

const Dashboard: React.FC<DashboardProps> = ({ migrations, onTabChange }) => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Load system stats from the database
  useEffect(() => {
    const loadSystemStats = async () => {
      try {
        const stats = await migrationService.getSystemStatus();
        // Ensure all required fields are present with defaults
        const enhancedStats = {
          ...stats,
          scheduled: stats.scheduled || 0,
          cancelled: stats.cancelled || 0
        };
        setSystemStats(enhancedStats);
      } catch (error) {
        console.error('Failed to load system stats:', error);
      }
    };

    loadSystemStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(loadSystemStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    // Use system stats from database if available, otherwise calculate from current migrations
    if (systemStats) {
      return {
        total: systemStats.total || 0,
        completed: systemStats.completed || 0,
        running: systemStats.running || 0,
        failed: systemStats.failed || 0,
        cancelled: systemStats.cancelled || 0,
        scheduled: systemStats.scheduled || 0,
        pending: systemStats.pending || 0,
        recentActivity: systemStats.recent_activity || 0,
        totalDataTransferred: systemStats.total_data_transferred || 0,
        averageSpeed: systemStats.average_speed || 0,
        successRate: systemStats.success_rate || 0,
        completedWithDifferences: systemStats.completed_with_differences || 0
      };
    }

    // Fallback calculation from current migrations data
    const total = migrations.length;
    const completed = migrations.filter(m => m.status === 'completed' || m.status === 'verified').length;
    const running = migrations.filter(m => m.status === 'running' || m.status === 'reconciling').length;
    const failed = migrations.filter(m => m.status === 'failed').length;
    const cancelled = migrations.filter(m => m.status === 'cancelled').length;
    const scheduled = migrations.filter(m => m.status === 'scheduled').length;
    const pending = migrations.filter(m => m.status === 'starting').length;

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = migrations.filter(m => m.startTime && new Date(m.startTime) > oneDayAgo).length;

    const totalDataTransferred = migrations
      .filter(m => m.stats?.transferredSize)
      .reduce((sum, m) => sum + m.stats.transferredSize, 0);

    const averageSpeed = migrations
      .filter(m => m.stats?.speed > 0)
      .reduce((sum, m, _, arr) => sum + m.stats.speed / arr.length, 0);

    return {
      total,
      completed,
      running,
      failed,
      cancelled,
      scheduled,
      pending,
      recentActivity,
      totalDataTransferred,
      averageSpeed,
      successRate: total > 0 ? ((completed / total) * 100) : 0,
      completedWithDifferences: migrations.filter(m => m.status === 'completed_with_differences').length
    };
  }, [migrations, systemStats]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayMigrations = migrations.filter(m => {
        if (!m.startTime) return false;
        try {
          const migrationDate = new Date(m.startTime);
          if (isNaN(migrationDate.getTime())) return false;
          return format(migrationDate, 'yyyy-MM-dd') === dateStr;
        } catch (error) {
          console.warn('Invalid startTime for migration:', m.id, m.startTime);
          return false;
        }
      });

      return {
        date: format(date, 'MMM dd'),
        migrations: dayMigrations.length,
        completed: dayMigrations.filter(m => m.status === 'completed' || m.status === 'verified').length,
        failed: dayMigrations.filter(m => m.status === 'failed').length
      };
    });

    return last7Days;
  }, [migrations]);

  const statusDistribution = [
    { name: 'Completed', value: stats.completed, color: '#10B981' },
    { name: 'Running', value: stats.running, color: '#3B82F6' },
    { name: 'Scheduled', value: stats.scheduled, color: '#8B5CF6' },
    { name: 'Failed', value: stats.failed, color: '#EF4444' },
    { name: 'Pending', value: stats.pending, color: '#F59E0B' }
  ].filter(item => item.value > 0);

  const recentMigrations = useMemo(() => {
    return migrations
      .filter(migration => migration.config && migration.id) // Filter out incomplete migrations
      .sort((a, b) => {
        // Handle null startTime for scheduled migrations
        const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
        return bTime - aTime;
      }) // Most recent first
      .slice(0, 8); // Show up to 8 recent migrations
  }, [migrations]);

  const handleViewLogs = (migrationId: string) => {
    if (onTabChange) {
      // Store selected migration in localStorage so LogsTab can pick it up
      localStorage.setItem('selectedMigrationForLogs', migrationId);
      onTabChange('logs');
    }
  };

  const handleViewHistory = () => {
    if (onTabChange) {
      onTabChange('history');
    }
  };

  const isRecentActivity = (startTime: string | null) => {
    if (!startTime) return false;
    const migrationTime = new Date(startTime);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return migrationTime > tenMinutesAgo;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-2">Overview of your S3 bucket migrations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentDuplicateIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Migrations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-green-600">{stats.successRate.toFixed(1)}% success rate</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowPathIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.running}</p>
              <p className="text-sm text-blue-600">Currently running</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              <p className="text-sm text-purple-600">Awaiting execution</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Migration Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="migrations" stroke="#3B82F6" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          {statusDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-72 text-gray-500">
              <p>No migration data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Migrations */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Migrations</h3>
            <button
              onClick={handleViewHistory}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
            >
              View all
              <ArrowTopRightOnSquareIcon className="ml-1 w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {recentMigrations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source → Destination
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentMigrations.map((migration) => (
                  <tr key={migration.id} className={`hover:bg-gray-50 ${isRecentActivity(migration.startTime) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {migration.config?.source || 'Unknown'} → {migration.config?.destination || 'Unknown'}
                        </div>
                        {isRecentActivity(migration.startTime) && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {migration.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        migration.status === 'completed' || migration.status === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : migration.status === 'running' || migration.status === 'reconciling'
                          ? 'bg-blue-100 text-blue-800'
                          : migration.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {migration.status === 'verified' ? 'completed & verified' : migration.status}
                      </span>
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
                      {migration.startTime ? format(new Date(migration.startTime), 'MMM dd, HH:mm') : 'Scheduled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {migration.duration ? `${Math.round(migration.duration)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewLogs(migration.id)}
                          className="text-blue-600 hover:text-blue-500"
                          title="View logs"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent migrations</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start a migration to see it here, or{' '}
                <button
                  onClick={handleViewHistory}
                  className="text-blue-600 hover:text-blue-500"
                >
                  view all migrations
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;