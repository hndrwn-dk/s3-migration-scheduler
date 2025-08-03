import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  ArrowRightIcon,
  CloudIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import { Migration, S3Alias, S3Bucket, MigrationFormData } from '../types';
import { bucketService, migrationService } from '../services/api';

interface MigrateTabProps {
  onMigrationStart: (migration: Migration) => void;
}

const MigrateTab: React.FC<MigrateTabProps> = ({ onMigrationStart }) => {
  const [aliases, setAliases] = useState<S3Alias[]>([]);
  const [sourceBuckets, setSourceBuckets] = useState<S3Bucket[]>([]);
  const [destinationBuckets, setDestinationBuckets] = useState<S3Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [formData, setFormData] = useState<MigrationFormData>({
    sourceAlias: '',
    sourceBucket: '',
    destinationAlias: '',
    destinationBucket: '',
    overwrite: false,
    remove: false,
    exclude: [],
    // Advanced MinIO mirror options
    checksum: undefined,
    preserve: true,
    retry: true,
    dryRun: false,
    watch: false,
    // Scheduling options
    executionType: 'immediate',
    scheduledTime: ''
  });

  const [excludePattern, setExcludePattern] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadAliases();
  }, []);

  const loadAliases = () => {
    try {
      const saved = localStorage.getItem('s3-aliases');
      if (saved) {
        setAliases(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load aliases:', error);
      toast.error('Failed to load S3 connections');
    }
  };

  const loadSourceBuckets = useCallback(async () => {
    try {
      const buckets = await bucketService.listBuckets(formData.sourceAlias);
      setSourceBuckets(buckets);
    } catch (error) {
      toast.error(`Failed to load source buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSourceBuckets([]);
    }
  }, [formData.sourceAlias]);

  const loadDestinationBuckets = useCallback(async () => {
    try {
      const buckets = await bucketService.listBuckets(formData.destinationAlias);
      setDestinationBuckets(buckets);
    } catch (error) {
      toast.error(`Failed to load destination buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDestinationBuckets([]);
    }
  }, [formData.destinationAlias]);

  useEffect(() => {
    if (formData.sourceAlias) {
      loadSourceBuckets();
    } else {
      setSourceBuckets([]);
      setFormData(prev => ({ ...prev, sourceBucket: '' }));
    }
  }, [formData.sourceAlias, loadSourceBuckets]);

  useEffect(() => {
    if (formData.destinationAlias) {
      loadDestinationBuckets();
    } else {
      setDestinationBuckets([]);
      setFormData(prev => ({ ...prev, destinationBucket: '' }));
    }
  }, [formData.destinationAlias, loadDestinationBuckets]);



  const validateMigration = async () => {
    setValidating(true);
    try {
      const source = `${formData.sourceAlias}/${formData.sourceBucket}`;
      const destination = `${formData.destinationAlias}/${formData.destinationBucket}`;
      
      const result = await migrationService.validateMigration(source, destination);
      
      if (result.valid) {
        toast.success('Migration configuration is valid!');
        return true;
      } else {
        toast.error(`Validation failed: ${result.errors.join(', ')}`);
        return false;
      }
    } catch (error) {
      toast.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sourceAlias || !formData.sourceBucket || !formData.destinationAlias || !formData.destinationBucket) {
      toast.error('Please select source and destination buckets');
      return;
    }

    // Validate scheduled time if scheduling is selected
    if (formData.executionType === 'scheduled') {
      if (!formData.scheduledTime) {
        toast.error('Please select a scheduled time');
        return;
      }
      
      const scheduledDate = new Date(formData.scheduledTime);
      const now = new Date();
      
      if (scheduledDate <= now) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    }

    // Validate migration first
    const isValid = await validateMigration();
    if (!isValid) return;

    setLoading(true);
    try {
      // Debug frontend form data
      console.log('FRONTEND DEBUG: formData.executionType:', formData.executionType);
      console.log('FRONTEND DEBUG: formData.scheduledTime:', formData.scheduledTime);
      console.log('FRONTEND DEBUG: scheduledTime type:', typeof formData.scheduledTime);
      console.log('FRONTEND DEBUG: scheduledTime length:', formData.scheduledTime?.length);
      
      const migrationConfig: any = {
        source: `${formData.sourceAlias}/${formData.sourceBucket}`,
        destination: `${formData.destinationAlias}/${formData.destinationBucket}`,
        options: {
          overwrite: formData.overwrite,
          remove: formData.remove,
          exclude: formData.exclude,
          // Advanced MinIO options
          checksum: formData.checksum,
          preserve: formData.preserve,
          retry: formData.retry,
          dryRun: formData.dryRun,
          watch: formData.watch
        }
      };

      // Add scheduledTime only if it's a scheduled migration with a valid time
      if (formData.executionType === 'scheduled' && formData.scheduledTime) {
        migrationConfig.scheduledTime = formData.scheduledTime;
      }
      
      console.log('FRONTEND DEBUG: Final migrationConfig:', JSON.stringify(migrationConfig, null, 2));

      const result = await migrationService.startMigration(migrationConfig);
      
      // Real-time updates will handle adding the migration to the state
      // No need to manually call onMigrationStart as WebSocket/SSE will notify
      
      if (formData.executionType === 'scheduled') {
        const scheduledDate = new Date(formData.scheduledTime);
        toast.success(`Migration scheduled successfully! ID: ${result.migrationId.slice(0, 8)}, scheduled for ${scheduledDate.toLocaleString()}`);
      } else {
        toast.success(`Migration started successfully! ID: ${result.migrationId.slice(0, 8)}`);
      }
      
      // Reset form
      setFormData({
        sourceAlias: '',
        sourceBucket: '',
        destinationAlias: '',
        destinationBucket: '',
        overwrite: false,
        remove: false,
        exclude: [],
        // Advanced MinIO options
        checksum: undefined,
        preserve: true,
        retry: true,
        dryRun: false,
        watch: false,
        // Scheduling options
        executionType: 'immediate',
        scheduledTime: ''
      });

      
    } catch (error) {
      toast.error(`Failed to start migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const addExcludePattern = () => {
    if (excludePattern.trim() && !formData.exclude.includes(excludePattern.trim())) {
      setFormData(prev => ({
        ...prev,
        exclude: [...prev.exclude, excludePattern.trim()]
      }));
      setExcludePattern('');
    }
  };

  const removeExcludePattern = (pattern: string) => {
    setFormData(prev => ({
      ...prev,
      exclude: prev.exclude.filter(p => p !== pattern)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Start Migration</h2>
        <p className="text-gray-600 mt-2">Select specific buckets from your configured aliases and start migration</p>
        <p className="text-sm text-gray-500 mt-1">
          Tip: Aliases are configured on the <strong>Configure</strong> tab. Here you select specific buckets: <code>alias/bucket-name</code>
        </p>
      </div>

      {aliases.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">
              No S3 connections configured. Please go to the Configure tab to set up your connections first.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Source and Destination Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Source and Destination</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 flex items-center">
                <CloudIcon className="w-5 h-5 mr-2 text-blue-600" />
                Source
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">S3 Connection</label>
                <select
                  value={formData.sourceAlias}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceAlias: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select source connection...</option>
                  {aliases.map(alias => (
                    <option key={alias.name} value={alias.name}>{alias.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bucket</label>
                <select
                  value={formData.sourceBucket}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceBucket: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!formData.sourceAlias || sourceBuckets.length === 0}
                >
                  <option value="">Select source bucket...</option>
                  {sourceBuckets.map(bucket => (
                    <option key={bucket.name} value={bucket.name}>{bucket.name}</option>
                  ))}
                </select>
                {formData.sourceAlias && sourceBuckets.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No buckets found</p>
                )}
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center lg:justify-start">
              <ArrowRightIcon className="w-8 h-8 text-gray-400" />
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 flex items-center">
                <CloudIcon className="w-5 h-5 mr-2 text-green-600" />
                Destination
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">S3 Connection</label>
                <select
                  value={formData.destinationAlias}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationAlias: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select destination connection...</option>
                  {aliases.map(alias => (
                    <option key={alias.name} value={alias.name}>{alias.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bucket</label>
                <select
                  value={formData.destinationBucket}
                  onChange={(e) => setFormData(prev => ({ ...prev, destinationBucket: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!formData.destinationAlias || destinationBuckets.length === 0}
                >
                  <option value="">Select destination bucket...</option>
                  {destinationBuckets.map(bucket => (
                    <option key={bucket.name} value={bucket.name}>{bucket.name}</option>
                  ))}
                </select>
                {formData.destinationAlias && destinationBuckets.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">No buckets found</p>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Advanced Options */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Migration Options</h3>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.overwrite}
                  onChange={(e) => setFormData(prev => ({ ...prev, overwrite: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Overwrite existing files
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.remove}
                  onChange={(e) => setFormData(prev => ({ ...prev, remove: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Remove files from destination that don't exist in source
                </span>
              </label>
            </div>

            {showAdvanced && (
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Exclude Patterns</label>
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      value={excludePattern}
                      onChange={(e) => setExcludePattern(e.target.value)}
                      placeholder="e.g., *.tmp, logs/*, .DS_Store"
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addExcludePattern();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addExcludePattern}
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Add patterns to exclude files from migration
                  </p>

                  {formData.exclude.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-2">
                        {formData.exclude.map((pattern, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {pattern}
                            <button
                              type="button"
                              onClick={() => removeExcludePattern(pattern)}
                              className="ml-1 text-blue-600 hover:text-blue-800"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Advanced MinIO Options */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Advanced MinIO Mirror Options</h4>
                  
                  {/* Checksum Algorithm */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Checksum Algorithm</label>
                    <select
                      value={formData.checksum || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        checksum: e.target.value as 'CRC64NVME' | 'CRC32' | 'CRC32C' | 'SHA1' | 'SHA256' | undefined 
                      }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Default (no checksum verification)</option>
                      <option value="CRC64NVME">CRC64NVME</option>
                      <option value="CRC32">CRC32</option>
                      <option value="CRC32C">CRC32C</option>
                      <option value="SHA1">SHA1</option>
                      <option value="SHA256">SHA256</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Enable checksum verification for data integrity during transfer
                    </p>
                  </div>

                  {/* Advanced Options Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.preserve}
                        onChange={(e) => setFormData(prev => ({ ...prev, preserve: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Preserve attributes
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.retry}
                        onChange={(e) => setFormData(prev => ({ ...prev, retry: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Enable retry on errors
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.dryRun}
                        onChange={(e) => setFormData(prev => ({ ...prev, dryRun: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Dry run (test mode)
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.watch}
                        onChange={(e) => setFormData(prev => ({ ...prev, watch: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Watch for changes
                      </span>
                    </label>
                  </div>

                  {/* Option Descriptions */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>Preserve attributes:</strong> Maintains file/object attributes and bucket policies/locking configurations</p>
                    <p><strong>Enable retry:</strong> Automatically retries failed objects during migration</p>
                    <p><strong>Dry run:</strong> Simulates the migration without actually transferring files</p>
                    <p><strong>Watch for changes:</strong> Continuously monitors source and syncs new/changed files</p>
                  </div>

                  {/* Dry Run Warning */}
                  {formData.dryRun && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Dry Run Mode Enabled
                          </h3>
                          <div className="mt-1 text-sm text-yellow-700">
                            <p>This migration will simulate the process without actually transferring any files. Perfect for testing and validation.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Watch Mode Warning */}
                  {formData.watch && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="flex">
                        <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Watch Mode Enabled
                          </h3>
                          <div className="mt-1 text-sm text-blue-700">
                            <p>Migration will run continuously, monitoring source for new/changed files. Perfect for ongoing synchronization.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Command Preview */}
        {formData.sourceAlias && formData.sourceBucket && formData.destinationAlias && formData.destinationBucket && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">MinIO Command Preview</h3>
            <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm overflow-x-auto">
              <div className="mb-2 text-gray-400"># This command will be executed:</div>
              <div>
                mc mirror
                {formData.overwrite ? ' --overwrite' : ''}
                {formData.remove ? ' --remove' : ''}
                {formData.exclude.length > 0 ? formData.exclude.map(pattern => ` --exclude "${pattern}"`).join('') : ''}
                                 {formData.checksum ? ` --checksum ${formData.checksum}` : ''}
                 {formData.preserve ? ' --preserve' : ''}
                 {formData.retry ? ' --retry' : ''}
                 {formData.dryRun ? ' --dry-run' : ''}
                 {formData.watch ? ' --watch' : ''}
                {' '}
                <span className="text-yellow-400">{formData.sourceAlias}/{formData.sourceBucket}</span>
                {' '}
                <span className="text-blue-400">{formData.destinationAlias}/{formData.destinationBucket}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              <strong>Source:</strong> {formData.sourceAlias}/{formData.sourceBucket} • 
              <strong>Destination:</strong> {formData.destinationAlias}/{formData.destinationBucket}
            </p>
          </div>
        )}

        {/* Execution Timing */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Execution Timing</h4>
          
          <div className="space-y-4">
            {/* Execution Type Selection */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="executionType"
                  value="immediate"
                  checked={formData.executionType === 'immediate'}
                  onChange={(e) => setFormData(prev => ({ ...prev, executionType: 'immediate' }))}
                  className="text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Start Immediately
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="executionType"
                  value="scheduled"
                  checked={formData.executionType === 'scheduled'}
                  onChange={(e) => setFormData(prev => ({ ...prev, executionType: 'scheduled' }))}
                  className="text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Schedule for Later
                </span>
              </label>
            </div>

            {/* Scheduled Time Picker */}
            {formData.executionType === 'scheduled' && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Scheduled Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledTime}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // At least 1 minute from now
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  {formData.scheduledTime && (
                    <span className="ml-2 text-blue-600">
                      Starts in: {(() => {
                        const scheduledDate = new Date(formData.scheduledTime);
                        const now = new Date();
                        const diffMs = scheduledDate.getTime() - now.getTime();
                        if (diffMs <= 0) return 'Past time selected';
                        
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (diffHours > 0) {
                          return `${diffHours}h ${diffMinutes}m`;
                        } else {
                          return `${diffMinutes}m`;
                        }
                      })()}
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <InformationCircleIcon className="w-4 h-4 mr-1" />
            {formData.dryRun 
              ? 'Dry run will simulate the migration without transferring files'
              : formData.executionType === 'scheduled'
                ? 'Migration will be scheduled and executed at the specified time'
                : 'Migration will start immediately after clicking "Start Migration"'
            }
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={validateMigration}
              disabled={!formData.sourceAlias || !formData.sourceBucket || !formData.destinationAlias || !formData.destinationBucket || validating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {validating ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4 mr-2" />
                  Validate
                </>
              )}
            </button>
            
            <button
              type="submit"
              disabled={!formData.sourceAlias || !formData.sourceBucket || !formData.destinationAlias || !formData.destinationBucket || loading}
              className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="small" className="mr-2" />
                  {formData.executionType === 'scheduled' ? 'Scheduling Migration...' : 'Starting Migration...'}
                </>
              ) : (
                <>
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  {formData.dryRun 
                    ? 'Run Dry Migration Test' 
                    : formData.executionType === 'scheduled'
                      ? 'Schedule Migration'
                      : 'Start Migration'
                  }
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MigrateTab;