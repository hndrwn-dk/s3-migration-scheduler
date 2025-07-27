export interface S3Alias {
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
}

export interface S3Bucket {
  name: string;
  size: number;
  lastModified: string | null;
  type: string;
  formattedSize?: string;
  totalObjects?: number;
}

export interface BucketInfo extends S3Bucket {
  totalSize: number;
  totalObjects: number;
  formattedSize: string;
  estimatedMigrationTime?: string;
  recommendations?: string[];
}

export interface MigrationConfig {
  source: string;
  destination: string;
  options: {
    overwrite: boolean;
    remove: boolean;
    exclude: string[];
  };
}

export interface MigrationStats {
  totalObjects: number;
  transferredObjects: number;
  totalSize: number;
  transferredSize: number;
  speed: number;
}

export interface ReconciliationDifference {
  path: string;
  status: string;
  sourceSize: number;
  targetSize: number;
}

export interface Reconciliation {
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  differences: ReconciliationDifference[];
  error?: string;
}

export interface Migration {
  id: string;
  config: MigrationConfig;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'reconciling' | 'verified' | 'completed_with_differences';
  progress: number;
  startTime: string;
  endTime?: string;
  stats: MigrationStats;
  errors: string[];
  reconciliation?: Reconciliation;
  duration?: number;
}

export interface WebSocketMessage {
  type: 'connection' | 'migration_update' | 'error';
  clientId?: string;
  message?: string;
  data?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  sourceValid: boolean;
  destinationValid: boolean;
  errors: string[];
}

export interface HealthCheck {
  installed: boolean;
  version?: string;
  error?: string;
}

// UI State Types
export interface UIState {
  loading: boolean;
  error: string | null;
  connected: boolean;
}

export interface MigrationFormData {
  sourceAlias: string;
  sourceBucket: string;
  destinationAlias: string;
  destinationBucket: string;
  overwrite: boolean;
  remove: boolean;
  exclude: string[];
}

export type TabType = 'dashboard' | 'configure' | 'migrate' | 'history' | 'logs';

export interface LogEntry {
  id: string;
  migrationId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}