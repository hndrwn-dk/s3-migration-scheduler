import { Migration } from '../types';

export interface SSEMessage {
  type: 'connection' | 'migration_update' | 'initial_data' | 'heartbeat' | 'error';
  data?: any;
  message?: string;
  timestamp: string;
  clientId?: string;
  error?: string;
}

class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnecting = false;
  private url: string;

  constructor() {
    this.url = `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/migration/stream`;
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.eventSource && this.eventSource.readyState === EventSource.OPEN)) {
      return;
    }

    this.isConnecting = true;
    console.log('🔌 Connecting to SSE:', this.url);

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onopen = () => {
        console.log('🔌 SSE connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (event) => {
        console.error('🔌 SSE error:', event);
        this.isConnecting = false;
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleDisconnection();
        }
      };

    } catch (error) {
      console.error('🔌 Failed to create SSE connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('🔌 SSE max reconnection attempts reached');
      const errorHandler = this.messageHandlers.get('error');
      if (errorHandler) {
        errorHandler({ message: 'Connection lost and max reconnection attempts reached' });
      }
    }
  }

  private scheduleReconnect() {
    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting SSE (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.messageHandlers.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  private handleMessage(message: SSEMessage) {
    console.log('📨 SSE message received:', message.type);
    
    switch (message.type) {
      case 'connection':
        console.log('✅ SSE connection established:', message.message);
        break;
        
      case 'initial_data':
        const initialDataHandler = this.messageHandlers.get('initial_data');
        if (initialDataHandler && message.data) {
          initialDataHandler(message.data);
        }
        break;
        
      case 'migration_update':
        const updateHandler = this.messageHandlers.get('migration_update');
        if (updateHandler && message.data) {
          updateHandler(message.data);
        }
        break;
        
      case 'heartbeat':
        // Keep-alive message, no action needed
        break;
        
      case 'error':
        console.error('🔌 SSE error message:', message.message);
        const errorHandler = this.messageHandlers.get('error');
        if (errorHandler) {
          errorHandler(message);
        }
        break;
        
      default:
        console.log('🔌 Unknown SSE message type:', message.type);
    }
  }

  onInitialData(callback: (migrations: Migration[]) => void) {
    this.messageHandlers.set('initial_data', callback);
  }

  onMigrationUpdate(callback: (migrationData: any) => void) {
    this.messageHandlers.set('migration_update', callback);
  }

  onError(callback: (error: any) => void) {
    this.messageHandlers.set('error', callback);
  }

  removeHandler(type: string) {
    this.messageHandlers.delete(type);
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  getConnectionState(): string {
    if (!this.eventSource) return 'disconnected';
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting';
      case EventSource.OPEN:
        return 'connected';
      case EventSource.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Force refresh migration data
  refresh() {
    if (this.isConnected()) {
      // Since SSE is unidirectional, we'll disconnect and reconnect to get fresh data
      this.disconnect();
      setTimeout(() => this.connect(), 1000);
    }
  }
}

// Create a singleton instance
const sseService = new SSEService();

export default sseService;