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
  ScheduledMigrationStats,
  SystemStatsResponse,
  AiPublicSettings,
  AiInsight
} from '../types';
import { AxiosError } from 'axios';

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
    return handleApiError(error);
  }
);

const handleApiError = (error: AxiosError): never => {
  console.error('API Error:', error);
  
  if (error.response) {
    const data = error.response.data as { error?: string | { message?: string } } | undefined;
    const serverMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
    if (serverMessage) {
      throw new Error(serverMessage);
    }
    // Server responded with error status
    if (error.response.status === 404) {
      throw new Error('Resource not found');
    } else if (error.response.status >= 500) {
      throw new Error('Server error occurred');
    } else if (error.response.status === 403) {
      throw new Error('Access denied - please check your permissions');
    } else if (error.response.status === 401) {
      throw new Error('Authentication required');
    } else {
      throw new Error(`Request failed: ${error.response.status}`);
    }
  } else if (error.request) {
    // Network or connection errors
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server. The application may still be starting up - please wait a moment and try again.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('Request timed out. This might be due to network restrictions in corporate environments.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Server not found. Please check your network connection.');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. This might be blocked by corporate firewall or proxy settings.');
    } else {
      throw new Error(`Connection failed: ${error.message}. This might be due to corporate network policies.`);
    }
  } else {
    // Something else happened
    throw new Error(`Request failed: ${error.message}`);
  }
};

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

  // Search buckets for an alias (for large datasets - server-side filtering)
  searchBuckets: async (aliasName: string, searchTerm: string, limit: number = 50, offset: number = 0): Promise<{ buckets: S3Bucket[]; total: number; hasMore: boolean }> => {
    const params = new URLSearchParams({
      search: searchTerm,
      limit: limit.toString(),
      offset: offset.toString()
    });
    const response = await api.get<ApiResponse<{ buckets: S3Bucket[]; total: number; hasMore: boolean }>>(`/buckets/search/${aliasName}?${params}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to search buckets');
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
  getSystemStatus: async (): Promise<SystemStatsResponse> => {
    const response = await api.get<ApiResponse<SystemStatsResponse>>('/migration/status');
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

export const aiService = {
  getSettings: async (): Promise<AiPublicSettings> => {
    const response = await api.get<ApiResponse<AiPublicSettings>>('/ai/settings');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to load AI settings');
    }
    return response.data.data;
  },

  saveSettings: async (settings: { baseUrl: string; model: string; apiKey?: string }): Promise<AiPublicSettings> => {
    const response = await api.put<ApiResponse<AiPublicSettings>>('/ai/settings', settings);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to save AI settings');
    }
    return response.data.data;
  },

  testConnection: async (): Promise<void> => {
    const response = await api.post<ApiResponse<{ ok: boolean }>>('/ai/test');
    if (!response.data.success) {
      throw new Error(response.data.error || 'AI connection test failed');
    }
  },

  explainFailure: async (migrationId: string): Promise<AiInsight> => {
    const response = await api.post<ApiResponse<AiInsight>>('/ai/explain-failure', { migrationId });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to explain migration');
    }
    return response.data.data;
  },

  summarizeReconciliation: async (migrationId: string): Promise<AiInsight> => {
    const response = await api.post<ApiResponse<AiInsight>>('/ai/summarize-reconciliation', { migrationId });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to summarize reconciliation');
    }
    return response.data.data;
  },

  suggestMigration: async (aliasName: string, bucketName: string): Promise<AiInsight> => {
    const response = await api.post<ApiResponse<AiInsight>>('/ai/suggest-migration', { aliasName, bucketName });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to suggest migration settings');
    }
    return response.data.data;
  },
};

export function readServerHealth(body: {
  success?: boolean;
  error?: string;
  status?: string;
  timestamp?: string;
  version?: string;
  data?: { status?: string; timestamp?: string; version?: string };
} | null | undefined): { status: string; timestamp: string; version: string } {
  if (body?.status === 'healthy') {
    return {
      status: body.status,
      timestamp: body.timestamp || '',
      version: body.version || ''
    };
  }
  if (body?.success && body.data?.status) {
    return {
      status: body.data.status,
      timestamp: body.data.timestamp || '',
      version: body.data.version || ''
    };
  }
  throw new Error(body?.error || 'Health check failed');
}

export const healthService = {
  // General health check. The server returns { status, timestamp, version }
  // directly, without the { success, data } envelope used by other routes.
  checkHealth: async (): Promise<{ status: string; timestamp: string; version: string }> => {
    const response = await api.get('/health');
    return readServerHealth(response?.data);
  },
};

export default api;