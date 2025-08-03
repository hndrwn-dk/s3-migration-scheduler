export interface SystemStatsResponse {
  total: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  scheduled?: number; // Optional for backward compatibility
  completed_with_differences: number;
  recent_activity: number;
  total_data_transferred: number;
  average_speed: number;
  success_rate: number;
}

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
  scheduledTime?: string;
  options: {
    overwrite: boolean;
    remove: boolean;
    exclude: string[];
    // Advanced MinIO mirror options
    checksum?: 'CRC64NVME' | 'CRC32' | 'CRC32C' | 'SHA1' | 'SHA256';
    preserve: boolean;
    retry: boolean;
    dryRun: boolean;
    watch: boolean;
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

export interface BucketStats {
  objectCount: number;
  totalSize: number;
}

export interface ReconciliationSummary {
  objectCountMatch: boolean;
  totalSizeMatch: boolean;
  differencesFound: boolean;
}

export interface Reconciliation {
  status: 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  differences: ReconciliationDifference[];
  missingFiles?: any[];
  extraFiles?: any[];
  sizeDifferences?: any[];
  error?: string;
  sourceStats?: BucketStats;
  destStats?: BucketStats;
  summary?: ReconciliationSummary;
}

export interface Migration {
  id: string;
  config: MigrationConfig;
  status: 'starting' | 'running' | 'completed' | 'failed' | 'cancelled' | 'reconciling' | 'verified' | 'completed_with_differences' | 'scheduled';
  progress: number;
  startTime: string | null;
  endTime?: string;
  scheduledTime?: string;
  executionStatus?: 'immediate' | 'scheduled' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
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

export interface ScheduledMigrationStats {
  totalScheduled: number;
  futureScheduled: number;
  pendingExecution: number;
  activeJobs: number;
}

export interface ScheduledMigrationsResponse {
  migrations: Migration[];
  stats: ScheduledMigrationStats;
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
  // Advanced MinIO mirror options
  checksum?: 'CRC64NVME' | 'CRC32' | 'CRC32C' | 'SHA1' | 'SHA256';
  preserve: boolean;
  retry: boolean;
  dryRun: boolean;
  watch: boolean;
  // Scheduling options
  executionType: 'immediate' | 'scheduled';
  scheduledTime: string;
}

export type TabType = 'dashboard' | 'configure' | 'migrate' | 'history' | 'logs' | 'scheduled';

export interface LogEntry {
  id: string;
  migrationId: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}