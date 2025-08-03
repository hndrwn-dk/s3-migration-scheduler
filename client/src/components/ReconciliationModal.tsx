import React from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { Migration } from '../types';

interface ReconciliationModalProps {
  migration: Migration | null;
  isOpen: boolean;
  onClose: () => void;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({ migration, isOpen, onClose }) => {
  if (!isOpen || !migration?.reconciliation) {
    return null;
  }

  const { reconciliation } = migration;
  const hasDifferences = 
    (reconciliation.differences?.length || 0) > 0 ||
    (reconciliation.missingFiles?.length || 0) > 0 ||
    (reconciliation.extraFiles?.length || 0) > 0 ||
    (reconciliation.sizeDifferences?.length || 0) > 0;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDifferenceIcon = (type: string) => {
    switch (type) {
      case 'missing':
        return <TrashIcon className="w-5 h-5 text-red-500" />;
      case 'extra':
        return <DocumentDuplicateIcon className="w-5 h-5 text-blue-500" />;
      case 'size':
        return <ScaleIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Migration Reconciliation Report</h3>
              <p className="text-sm text-gray-600">
                {migration.config.source} → {migration.config.destination}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
          <h4 className="text-md font-semibold text-orange-800 mb-2">Summary</h4>
          <p className="text-sm text-orange-700">
            {hasDifferences 
              ? "Migration completed but differences were found during reconciliation. Review the details below."
              : "Migration completed successfully with no differences found."
            }
          </p>
          <div className="mt-3 text-xs text-orange-600">
            <span className="font-medium">Migration ID:</span> {migration.id}
          </div>
        </div>

        {/* Differences Details */}
        <div className="space-y-6 max-h-96 overflow-y-auto">
          
          {/* Missing Files */}
          {reconciliation.missingFiles && reconciliation.missingFiles.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                {getDifferenceIcon('missing')}
                <h4 className="text-md font-semibold text-gray-900 ml-2">
                  Missing Files ({reconciliation.missingFiles.length})
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Files that exist in the source but are missing in the destination:
              </p>
              <div className="bg-red-50 rounded-md p-3 max-h-32 overflow-y-auto">
                {reconciliation.missingFiles.map((file, index) => (
                  <div key={index} className="text-sm text-red-800 py-2 border-b border-red-100 last:border-b-0">
                    <div className="font-medium">
                      {typeof file === 'string' ? file : file.path || 'Unknown file'}
                    </div>
                    {typeof file === 'object' && file.sourceUrl && (
                      <div className="text-xs text-red-600 mt-1 truncate">
                        Source: {file.sourceUrl}
                      </div>
                    )}
                    {typeof file === 'object' && file.sourceSize && (
                      <div className="text-xs text-red-600 mt-1">
                        Size: {formatFileSize(file.sourceSize)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra Files */}
          {reconciliation.extraFiles && reconciliation.extraFiles.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                {getDifferenceIcon('extra')}
                <h4 className="text-md font-semibold text-gray-900 ml-2">
                  Extra Files ({reconciliation.extraFiles.length})
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Files that exist in the destination but not in the source:
              </p>
              <div className="bg-blue-50 rounded-md p-3 max-h-32 overflow-y-auto">
                {reconciliation.extraFiles.map((file, index) => (
                  <div key={index} className="text-sm text-blue-800 py-2 border-b border-blue-100 last:border-b-0">
                    <div className="font-medium">
                      {typeof file === 'string' ? file : file.path || 'Unknown file'}
                    </div>
                    {typeof file === 'object' && file.targetUrl && (
                      <div className="text-xs text-blue-600 mt-1 truncate">
                        Destination: {file.targetUrl}
                      </div>
                    )}
                    {typeof file === 'object' && file.targetSize && (
                      <div className="text-xs text-blue-600 mt-1">
                        Size: {formatFileSize(file.targetSize)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Differences */}
          {reconciliation.sizeDifferences && reconciliation.sizeDifferences.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                {getDifferenceIcon('size')}
                <h4 className="text-md font-semibold text-gray-900 ml-2">
                  Size Differences ({reconciliation.sizeDifferences.length})
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Files with different sizes between source and destination:
              </p>
              <div className="bg-orange-50 rounded-md p-3 max-h-32 overflow-y-auto">
                {reconciliation.sizeDifferences.map((diff, index) => (
                  <div key={index} className="text-sm text-orange-800 py-2 border-b border-orange-100 last:border-b-0">
                    <div className="font-medium">{typeof diff === 'string' ? diff : diff.path || 'Unknown file'}</div>
                    {typeof diff === 'object' && diff.sourceSize !== undefined && diff.targetSize !== undefined && (
                      <div className="text-xs text-orange-600 mt-1">
                        Source: {formatFileSize(diff.sourceSize)} → Destination: {formatFileSize(diff.targetSize)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Differences - Only show if there are valid differences */}
          {reconciliation.differences && reconciliation.differences.length > 0 && 
           reconciliation.differences.some(diff => 
             typeof diff === 'string' || 
             (diff.path && !diff.path.startsWith('unknown-') && diff.status !== 'success')
           ) && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center mb-3">
                {getDifferenceIcon('general')}
                <h4 className="text-md font-semibold text-gray-900 ml-2">
                  Other Differences ({reconciliation.differences.filter(diff => 
                    typeof diff === 'string' || 
                    (diff.path && !diff.path.startsWith('unknown-') && diff.status !== 'success')
                  ).length})
                </h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Additional differences found during reconciliation:
              </p>
              <div className="bg-yellow-50 rounded-md p-3 max-h-32 overflow-y-auto">
                {reconciliation.differences
                  .filter(diff => 
                    typeof diff === 'string' || 
                    (diff.path && !diff.path.startsWith('unknown-') && diff.status !== 'success')
                  )
                  .map((diff, index) => (
                    <div key={index} className="text-sm text-yellow-800 py-2 border-b border-yellow-100 last:border-b-0">
                      <div className="font-medium">
                        {typeof diff === 'string' ? diff : diff.path || 'Unknown file'}
                      </div>
                      {typeof diff === 'object' && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Status: {diff.status} | 
                          Source: {diff.sourceSize || 0} bytes | 
                          Destination: {diff.targetSize || 0} bytes
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Debug Info</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Reconciliation Status: {reconciliation.status}</div>
                <div>General Differences: {reconciliation.differences?.length || 0}</div>
                <div>Missing Files: {reconciliation.missingFiles?.length || 0}</div>
                <div>Extra Files: {reconciliation.extraFiles?.length || 0}</div>
                <div>Size Differences: {reconciliation.sizeDifferences?.length || 0}</div>
                <div>Has Differences: {hasDifferences.toString()}</div>
                {reconciliation.differences && reconciliation.differences.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold">Raw Differences:</div>
                    <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto max-h-32">
                      {JSON.stringify(reconciliation.differences, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Differences Found */}
          {!hasDifferences && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="flex items-center">
                <div className="w-5 h-5 bg-green-500 rounded-full mr-3 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-md font-semibold text-green-800">All Files Match</h4>
                  <p className="text-sm text-green-700">No differences were found between source and destination.</p>
                  <p className="text-xs text-green-600 mt-1">
                    Migration was marked as "completed_with_differences" but no categorized differences found.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReconciliationModal;