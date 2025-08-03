import axios from 'axios';
import {
  ApiResponse,
  S3Alias,
  S3Bucket,
  BucketInfo,
  Migration,
  MigrationConfig,
  ValidationResult,
  HealthCheck,
  ScheduledMigrationsResponse,
  ScheduledMigrationStats
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error occurred');
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server');
    }
    throw error;
  }
);

export const bucketService = {
  // Check MinIO client health
  checkHealth: async (): Promise<HealthCheck> => {
    const response = await api.get<ApiResponse<HealthCheck>>('/buckets/health');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Health check failed');
    }
    return response.data.data!;
  },

  // Configure S3 alias
  configureAlias: async (alias: S3Alias): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<ApiResponse<{ success: boolean; message: string }>>('/buckets/alias', alias);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to configure alias');
    }
    return response.data.data!;
  },

  // List buckets for an alias
  listBuckets: async (aliasName: string): Promise<S3Bucket[]> => {
    const response = await api.get<ApiResponse<S3Bucket[]>>(`/buckets/list/${aliasName}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to list buckets');
    }
    return response.data.data!;
  },

  // Get bucket information
  getBucketInfo: async (aliasName: string, bucketName: string): Promise<BucketInfo> => {
    const response = await api.get<ApiResponse<BucketInfo>>(`/buckets/info/${aliasName}/${bucketName}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get bucket info');
    }
    return response.data.data!;
  },

  // Test alias connection
  testConnection: async (aliasName: string): Promise<{ connected: boolean; error?: string; bucketsCount?: number }> => {
    const response = await api.post<ApiResponse<{ connected: boolean; error?: string; bucketsCount?: number }>>(`/buckets/test/${aliasName}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to test connection');
    }
    return response.data.data!;
  },

  // Analyze bucket for migration
  analyzeBucket: async (aliasName: string, bucketName: string): Promise<BucketInfo> => {
    const response = await api.get<ApiResponse<BucketInfo>>(`/buckets/analyze/${aliasName}/${bucketName}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to analyze bucket');
    }
    return response.data.data!;
  },
};

export const migrationService = {
  // Get all migrations
  getAllMigrations: async (): Promise<Migration[]> => {
    const response = await api.get<ApiResponse<Migration[]>>('/migration');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get migrations');
    }
    return response.data.data!;
  },

  // Start a new migration
  startMigration: async (config: MigrationConfig): Promise<{ migrationId: string; status: string }> => {
    const response = await api.post<ApiResponse<{ migrationId: string; status: string }>>('/migration/start', config);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start migration');
    }
    return response.data.data!;
  },

  // Get migration status
  getMigrationStatus: async (migrationId: string): Promise<Migration> => {
    const response = await api.get<ApiResponse<Migration>>(`/migration/${migrationId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get migration status');
    }
    return response.data.data!;
  },

  // Get migration logs
  getMigrationLogs: async (migrationId: string): Promise<string> => {
    const response = await api.get<ApiResponse<{ logs: string }>>(`/migration/${migrationId}/logs`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get migration logs');
    }
    return response.data.data!.logs;
  },

  // Cancel migration
  cancelMigration: async (migrationId: string): Promise<{ success: boolean }> => {
    const response = await api.post<ApiResponse<{ success: boolean }>>(`/migration/${migrationId}/cancel`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel migration');
    }
    return response.data.data!;
  },

  // Validate migration configuration
  validateMigration: async (source: string, destination: string): Promise<ValidationResult> => {
    const response = await api.post<ApiResponse<ValidationResult>>('/migration/validate', { source, destination });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to validate migration');
    }
    return response.data.data!;
  },

  // Refresh migrations from storage
  refreshMigrations: async (): Promise<{ count: number; message: string }> => {
    const response = await api.post<ApiResponse<{ count: number; message: string }>>('/migration/refresh');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to refresh migrations');
    }
    return response.data.data!;
  },

  // Get migration system status
  getSystemStatus: async (): Promise<{
    total: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    scheduled?: number;
    completed_with_differences: number;
    recent_activity: number;
    total_data_transferred: number;
    average_speed: number;
    success_rate: number;
  }> => {
    const response = await api.get<ApiResponse<{
      total: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
      scheduled?: number;
      completed_with_differences: number;
      recent_activity: number;
      total_data_transferred: number;
      average_speed: number;
      success_rate: number;
    }>>('/migration/status');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get system status');
    }
    return response.data.data!;
  },

  // Scheduled migrations
  getScheduledMigrations: async (): Promise<ScheduledMigrationsResponse> => {
    const response = await api.get<ApiResponse<ScheduledMigrationsResponse>>('/migration/scheduled');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get scheduled migrations');
    }
    return response.data.data!;
  },

  cancelScheduledMigration: async (migrationId: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/migration/scheduled/${migrationId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to cancel scheduled migration');
    }
  },

  rescheduleMigration: async (migrationId: string, scheduledTime: string): Promise<void> => {
    const response = await api.put<ApiResponse>(`/migration/scheduled/${migrationId}`, { scheduledTime });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to reschedule migration');
    }
  },

  getSchedulerStats: async (): Promise<ScheduledMigrationStats> => {
    const response = await api.get<ApiResponse<ScheduledMigrationStats>>('/migration/scheduler/stats');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get scheduler stats');
    }
    return response.data.data!;
  },
};

export const healthService = {
  // General health check
  checkHealth: async (): Promise<{ status: string; timestamp: string; version: string }> => {
    const response = await api.get<ApiResponse<{ status: string; timestamp: string; version: string }>>('/health');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Health check failed');
    }
    return response.data.data!;
  },
};

export default api;