import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudIcon,
  KeyIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import { S3Alias } from '../types';
import { bucketService } from '../services/api';

const ConfigureTab: React.FC = () => {
  const [aliases, setAliases] = useState<S3Alias[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<Map<string, boolean>>(new Map());
  
  const [formData, setFormData] = useState<S3Alias>({
    name: '',
    endpoint: '',
    accessKey: '',
    secretKey: ''
  });

  const loadSavedAliases = useCallback(() => {
    try {
      const saved = localStorage.getItem('s3-aliases');
      if (saved) {
        const parsedAliases = JSON.parse(saved);
        setAliases(parsedAliases);
        // Test connections for all aliases
        parsedAliases.forEach((alias: S3Alias) => testConnection(alias.name));
      }
    } catch (error) {
      console.error('Failed to load aliases:', error);
    }
  }, []);

  useEffect(() => {
    // Load saved aliases from localStorage
    loadSavedAliases();
    checkMinIOHealth();
  }, [loadSavedAliases]);

  const saveAliases = (newAliases: S3Alias[]) => {
    try {
      localStorage.setItem('s3-aliases', JSON.stringify(newAliases));
    } catch (error) {
      console.error('Failed to save aliases:', error);
    }
  };

  const checkMinIOHealth = async () => {
    try {
      const health = await bucketService.checkHealth();
      if (!health.installed) {
        toast.warn('MinIO client not detected. Please install mc command-line tool.');
      } else {
        toast.success(`MinIO client detected: ${health.version}`);
      }
    } catch (error) {
      toast.error('Failed to check MinIO client health');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!formData.name || !formData.endpoint || !formData.accessKey || !formData.secretKey) {
        throw new Error('All fields are required');
      }

      // Validate alias name format
      if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
        throw new Error('Alias name can only contain letters, numbers, hyphens, and underscores');
      }

      // Validate alias name length
      if (formData.name.length < 1 || formData.name.length > 63) {
        throw new Error('Alias name must be between 1 and 63 characters');
      }

      // Validate endpoint format
      if (!formData.endpoint.startsWith('http://') && !formData.endpoint.startsWith('https://')) {
        throw new Error('Endpoint must start with http:// or https://');
      }

      // Check if alias name already exists
      if (aliases.some(alias => alias.name === formData.name)) {
        throw new Error('Alias name already exists');
      }

      // Configure alias on the backend
      await bucketService.configureAlias(formData);

      // Add to local state and save
      const newAliases = [...aliases, formData];
      setAliases(newAliases);
      saveAliases(newAliases);

      // Test the connection
      await testConnection(formData.name);

      toast.success(`Alias "${formData.name}" configured successfully!`);
      
      // Reset form
      setFormData({ name: '', endpoint: '', accessKey: '', secretKey: '' });
      setShowForm(false);
    } catch (error) {
      toast.error(`Failed to configure alias: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (aliasName: string) => {
    setTestingConnections(prev => new Set(prev).add(aliasName));
    
    try {
      const result = await bucketService.testConnection(aliasName);
      setConnectionStatus(prev => new Map(prev).set(aliasName, result.connected));
      
      if (result.connected) {
        toast.success(`Connection to "${aliasName}" successful! (${result.bucketsCount} buckets found)`);
      } else {
        toast.error(`Connection to "${aliasName}" failed: ${result.error}`);
      }
    } catch (error) {
      setConnectionStatus(prev => new Map(prev).set(aliasName, false));
      toast.error(`Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingConnections(prev => {
        const next = new Set(prev);
        next.delete(aliasName);
        return next;
      });
    }
  };

  const removeAlias = (aliasName: string) => {
    const newAliases = aliases.filter(alias => alias.name !== aliasName);
    setAliases(newAliases);
    saveAliases(newAliases);
    setConnectionStatus(prev => {
      const next = new Map(prev);
      next.delete(aliasName);
      return next;
    });
    toast.info(`Alias "${aliasName}" removed`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Configure S3 Connections</h2>
          <p className="text-gray-600 mt-2">Set up S3 endpoint aliases (connections only - buckets selected during migration)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add S3 Connection
        </button>
      </div>

      {/* Add New Alias Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New S3 Connection</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Alias Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., source-s3, dest-minio"
                  pattern="[a-zA-Z0-9_-]+"
                  maxLength={63}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Letters, numbers, hyphens, and underscores only (1-63 characters)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="https://s3.amazonaws.com or https://minio.example.com"
                  pattern="https?://.*"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must start with http:// or https://
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Access Key
                </label>
                <input
                  type="text"
                  value={formData.accessKey}
                  onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="AWS Access Key ID or MinIO Access Key"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="AWS Secret Access Key or MinIO Secret Key"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="small" className="mr-2" />
                    Configuring...
                  </>
                ) : (
                  'Add Connection'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Aliases */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Configured S3 Connections</h3>
          <p className="text-sm text-gray-600 mt-1">
            {aliases.length} connection{aliases.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        
        {aliases.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {aliases.map((alias) => {
              const isConnected = connectionStatus.get(alias.name);
              const isTesting = testingConnections.has(alias.name);
              
              return (
                <div key={alias.name} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <CloudIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{alias.name}</h4>
                        <p className="text-sm text-gray-600">{alias.endpoint}</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <KeyIcon className="w-4 h-4 mr-1" />
                            {alias.accessKey.substring(0, 8)}...
                          </div>
                          {isConnected !== undefined && (
                            <div className="flex items-center text-sm">
                              {isConnected ? (
                                <>
                                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
                                  <span className="text-green-600">Connected</span>
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                                  <span className="text-red-600">Connection Failed</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => testConnection(alias.name)}
                        disabled={isTesting}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {isTesting ? (
                          <>
                            <LoadingSpinner size="small" className="mr-2" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => removeAlias(alias.name)}
                        className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            <CloudIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No S3 connections</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first S3 connection.
            </p>
          </div>
        )}
      </div>

      {/* Troubleshooting Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">Troubleshooting 400 Errors</h3>
        <div className="space-y-2 text-sm text-yellow-800">
          <p>• <strong>Invalid alias name:</strong> Use only letters, numbers, hyphens, and underscores (1-63 chars)</p>
          <p>• <strong>Invalid endpoint:</strong> Must start with http:// or https://</p>
          <p>• <strong>Missing fields:</strong> All fields (name, endpoint, access key, secret key) are required</p>
          <p>• <strong>Duplicate name:</strong> Alias name must be unique</p>
          <p>• <strong>Special characters:</strong> Avoid spaces and special characters in alias names</p>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">MinIO Command Workflow</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div>
            <p><strong>Step 1 - Configure Aliases (This Page):</strong></p>
            <div className="bg-blue-100 p-2 rounded mt-1 font-mono text-xs">
              mc alias set source https://s3.ap-southeast-2.amazonaws.com ACCESS_KEY SECRET_KEY<br/>
              mc alias set target https://s3.ap-southeast-2.amazonaws.com ACCESS_KEY SECRET_KEY
            </div>
          </div>
          <div>
            <p><strong>Step 2 - Select Buckets (Migration Page):</strong></p>
            <div className="bg-blue-100 p-2 rounded mt-1 font-mono text-xs">
              mc mirror source/bucketkicep1 target/bucketkicep2
            </div>
          </div>
          <div className="space-y-1">
            <p>• <strong>For AWS S3:</strong> Use https://s3.amazonaws.com or regional endpoints</p>
            <p>• <strong>For MinIO:</strong> Use your MinIO server URL (e.g., https://minio.example.com)</p>
            <p>• <strong>Access Keys:</strong> Ensure your keys have proper permissions for bucket operations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigureTab;