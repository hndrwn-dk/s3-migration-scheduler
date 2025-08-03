import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  ClockIcon,
  XMarkIcon,
  PencilIcon,
  CalendarIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';
import { Migration, ScheduledMigrationsResponse } from '../types';
import { migrationService } from '../services/api';

interface ScheduledTabProps {
  onRefresh?: () => void;
}

const ScheduledTab: React.FC<ScheduledTabProps> = ({ onRefresh }) => {
  const [scheduledData, setScheduledData] = useState<ScheduledMigrationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState<{
    migration: Migration;
    newTime: string;
  } | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    loadScheduledMigrations();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadScheduledMigrations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadScheduledMigrations = async () => {
    setLoading(true);
    try {
      const data = await migrationService.getScheduledMigrations();
      setScheduledData(data);
    } catch (error) {
      console.error('Failed to load scheduled migrations:', error);
      toast.error('Failed to load scheduled migrations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (migrationId: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled migration?')) {
      return;
    }

    try {
      await migrationService.cancelScheduledMigration(migrationId);
      toast.success('Scheduled migration cancelled successfully');
      loadScheduledMigrations();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel scheduled migration:', error);
      toast.error('Failed to cancel scheduled migration');
    }
  };

  const handleReschedule = (migration: Migration) => {
    const currentScheduledTime = migration.scheduledTime || new Date().toISOString();
    const localTime = new Date(currentScheduledTime).toISOString().slice(0, 16);
    
    setRescheduleModal({
      migration,
      newTime: localTime
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleModal) return;

    const newScheduledTime = new Date(rescheduleModal.newTime);
    if (newScheduledTime <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    setRescheduleLoading(true);
    try {
      await migrationService.rescheduleMigration(
        rescheduleModal.migration.id,
        rescheduleModal.newTime
      );
      toast.success('Migration rescheduled successfully');
      setRescheduleModal(null);
      loadScheduledMigrations();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to reschedule migration:', error);
      toast.error('Failed to reschedule migration');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const getTimeRemaining = (scheduledTime: string): string => {
    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const diffMs = scheduled.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Ready to execute';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Scheduled Migrations</h2>
        <p className="text-gray-600">Manage your scheduled migration tasks</p>
      </div>

      {/* Statistics Cards */}
      {scheduledData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledData.stats.totalScheduled}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Future Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledData.stats.futureScheduled}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <PlayIcon className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Execution</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledData.stats.pendingExecution}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <div className="h-4 w-4 bg-orange-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{scheduledData.stats.activeJobs}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Migrations List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Migrations</h3>
            <button
              onClick={loadScheduledMigrations}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <ClockIcon className="w-4 h-4 mr-2" />
              )}
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          ) : scheduledData?.migrations && scheduledData.migrations.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Migration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Remaining
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scheduledData.migrations.map((migration) => (
                  <tr key={migration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {migration.config?.source || 'Unknown'} → {migration.config?.destination || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {migration.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {migration.scheduledTime ? format(new Date(migration.scheduledTime), 'PPpp') : 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {migration.scheduledTime ? getTimeRemaining(migration.scheduledTime) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {migration.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleReschedule(migration)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                          title="Reschedule"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(migration.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Migrations</h3>
              <p className="text-gray-500">You don't have any scheduled migrations at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reschedule Migration</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Migration: {rescheduleModal.migration.config?.source} → {rescheduleModal.migration.config?.destination}
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Scheduled Time
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleModal.newTime}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setRescheduleModal(prev => prev ? { ...prev, newTime: e.target.value } : null)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setRescheduleModal(null)}
                  disabled={rescheduleLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReschedule}
                  disabled={rescheduleLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {rescheduleLoading ? (
                    <>
                      <LoadingSpinner size="small" className="mr-2" />
                      Rescheduling...
                    </>
                  ) : (
                    'Reschedule'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledTab;