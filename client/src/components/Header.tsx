import React from 'react';
import { CloudIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  connected: boolean;
  connectionType?: 'websocket' | 'sse' | 'none';
  onOpenSettings?: () => void;
}

const Header: React.FC<HeaderProps> = ({ connected, connectionType = 'none', onOpenSettings }) => {
  const liveLabel = connectionType === 'websocket'
    ? 'WebSocket'
    : connectionType === 'sse'
      ? 'SSE'
      : '';

  return (
    <header className="border-b border-gray-200 bg-white shadow-soft">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
            <CloudIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">S3 Migration Dashboard</h1>
            <p className="text-sm text-gray-600">Migrate S3 buckets with MinIO client</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-success-500' : 'bg-error-500'}`} />
            <span className="text-sm text-gray-700">{connected ? 'Live' : 'Offline'}</span>
            {connected && liveLabel && (
              <span className="text-xs text-gray-500">{liveLabel}</span>
            )}
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <SparklesIcon className="h-4 w-4 text-primary-600" />
              Settings
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
