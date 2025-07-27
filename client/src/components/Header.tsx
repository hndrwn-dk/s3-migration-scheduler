import React from 'react';
import { CloudIcon, WifiIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface HeaderProps {
  connected: boolean;
}

const Header: React.FC<HeaderProps> = ({ connected }) => {
  return (
    <header className="bg-white shadow-lg border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <CloudIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                S3 Migration Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Migrate S3 buckets with MinIO client
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <WifiIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Real-time updates:</span>
              {connected ? (
                <div className="flex items-center space-x-1">
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <XCircleIcon className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-red-600">Disconnected</span>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;