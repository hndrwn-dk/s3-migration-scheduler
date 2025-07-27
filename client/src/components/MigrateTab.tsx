import React, { useState, useEffect } from 'react';
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
import { Migration, S3Alias, S3Bucket, BucketInfo, MigrationFormData } from '../types';
import { bucketService, migrationService } from '../services/api';

interface MigrateTabProps {
  onMigrationStart: (migration: Migration) => void;
}

const MigrateTab: React.FC<MigrateTabProps> = ({ onMigrationStart }) => {
  const [aliases, setAliases] = useState<S3Alias[]>([]);
  const [sourceBuckets, setSourceBuckets] = useState<S3Bucket[]>([]);
  const [destinationBuckets, setDestinationBuckets] = useState<S3Bucket[]>([]);
  const [bucketAnalysis, setBucketAnalysis] = useState<BucketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [formData, setFormData] = useState<MigrationFormData>({
    sourceAlias: '',
    sourceBucket: '',
    destinationAlias: '',
    destinationBucket: '',
    overwrite: false,
    remove: false,
    exclude: []
  });

  const [excludePattern, setExcludePattern] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadAliases();
  }, []);

  useEffect(() => {
    if (formData.sourceAlias) {
      loadSourceBuckets();
    } else {
      setSourceBuckets([]);
      setFormData(prev => ({ ...prev, sourceBucket: '' }));
    }
  }, [formData.sourceAlias]);

  useEffect(() => {
    if (formData.destinationAlias) {
      loadDestinationBuckets();
    } else {
      setDestinationBuckets([]);
      setFormData(prev => ({ ...prev, destinationBucket: '' }));
    }
  }, [formData.destinationAlias]);

  useEffect(() => {
    if (formData.sourceAlias && formData.sourceBucket) {
      analyzeBucket();
    } else {
      setBucketAnalysis(null);
    }
  }, [formData.sourceAlias, formData.sourceBucket]);

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

  const loadSourceBuckets = async () => {
    try {
      const buckets = await bucketService.listBuckets(formData.sourceAlias);
      setSourceBuckets(buckets);
    } catch (error) {
      toast.error(`Failed to load source buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSourceBuckets([]);
    }
  };

  const loadDestinationBuckets = async () => {
    try {
      const buckets = await bucketService.listBuckets(formData.destinationAlias);
      setDestinationBuckets(buckets);
    } catch (error) {
      toast.error(`Failed to load destination buckets: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDestinationBuckets([]);
    }
  };

  const analyzeBucket = async () => {
    setAnalyzing(true);
    try {
      const analysis = await bucketService.analyzeBucket(formData.sourceAlias, formData.sourceBucket);
      setBucketAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze bucket:', error);
      setBucketAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

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

    // Validate migration first
    const isValid = await validateMigration();
    if (!isValid) return;

    setLoading(true);
    try {
      const migrationConfig = {
        source: `${formData.sourceAlias}/${formData.sourceBucket}`,
        destination: `${formData.destinationAlias}/${formData.destinationBucket}`,
        options: {
          overwrite: formData.overwrite,
          remove: formData.remove,
          exclude: formData.exclude
        }
      };

      const result = await migrationService.startMigration(migrationConfig);
      
      // Get the migration details
      const migration = await migrationService.getMigrationStatus(result.migrationId);
      onMigrationStart(migration);
      
      toast.success(`Migration started successfully! ID: ${result.migrationId.slice(0, 8)}`);
      
      // Reset form
      setFormData({
        sourceAlias: '',
        sourceBucket: '',
        destinationAlias: '',
        destinationBucket: '',
        overwrite: false,
        remove: false,
        exclude: []
      });
      setBucketAnalysis(null);
      
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
        <h2 className="text-3xl font-bold text-gray-900">Start Migration</h2>
        <p className="text-gray-600 mt-2">Configure and start a new S3 bucket migration</p>
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

        {/* Bucket Analysis */}
        {(analyzing || bucketAnalysis) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bucket Analysis</h3>
            
            {analyzing ? (
              <LoadingSpinner text="Analyzing source bucket..." />
            ) : bucketAnalysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-600">Total Size</p>
                    <p className="text-2xl font-bold text-blue-900">{bucketAnalysis.formattedSize}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-600">Total Objects</p>
                    <p className="text-2xl font-bold text-green-900">{bucketAnalysis.totalObjects.toLocaleString()}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-600">Estimated Time</p>
                    <p className="text-2xl font-bold text-purple-900">{bucketAnalysis.estimatedMigrationTime}</p>
                  </div>
                </div>

                {bucketAnalysis.recommendations && bucketAnalysis.recommendations.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                      {bucketAnalysis.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <InformationCircleIcon className="w-4 h-4 mr-1" />
            Migration will start immediately after clicking "Start Migration"
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
                  Starting Migration...
                </>
              ) : (
                <>
                  <ArrowRightIcon className="w-4 h-4 mr-2" />
                  Start Migration
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