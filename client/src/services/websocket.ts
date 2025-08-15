import { WebSocketMessage } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    
    try {
      console.log(`Attempting WebSocket connection to ${wsUrl} (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Subscribe to migration updates
        this.send({
          type: 'subscribe',
          topic: 'migrations'
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`WebSocket disconnected: code=${event.code}, reason=${event.reason || 'No reason provided'}`);
        this.isConnecting = false;
        this.ws = null;
        
        // Enhanced error handling for corporate environments
        if (event.code === 1006) {
          console.warn('WebSocket connection lost unexpectedly. This might be due to corporate network policies.');
        } else if (event.code === 1011) {
          console.warn('WebSocket server error. The application server might be overloaded.');
        } else if (event.code === 1012) {
          console.warn('WebSocket service restart detected.');
        }
        
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        
        // Provide user-friendly error context
        console.warn('WebSocket connection failed. This might be due to:');
        console.warn('• Application server still starting up');
        console.warn('• Corporate firewall blocking WebSocket connections');
        console.warn('• Antivirus software interfering with localhost connections');
        console.warn('• Network proxy not configured for WebSocket protocol');
      };

      // Set connection timeout for corporate environments
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout - this might be due to corporate network restrictions');
          this.ws.close();
        }
      }, 10000); // 10 second timeout
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.handleReconnect();
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  private handleReconnect() {
    // Don't attempt reconnect if intentionally disconnected or max attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`❌ WebSocket max reconnection attempts (${this.maxReconnectAttempts}) reached. Real-time updates disabled.`);
      console.warn('This might be due to corporate network policies blocking WebSocket connections.');
      console.warn('Application will continue to work, but without real-time progress updates.');
      return;
    }

    // Exponential backoff for corporate environments (start with 3s, max 30s)
    const delay = Math.min(this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts), 30000);
    
    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay/1000}s`);
      this.connect();
    }, delay);
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('WebSocket message received:', message.type);
    
    switch (message.type) {
      case 'connection':
        console.log('WebSocket connection established:', message.message);
        break;
        
      case 'migration_update':
        const handler = this.messageHandlers.get('migration_update');
        if (handler && message.data) {
          handler(message.data);
        }
        break;
        
      case 'error':
        console.error('WebSocket error message:', message.message);
        const errorHandler = this.messageHandlers.get('error');
        if (errorHandler) {
          errorHandler(message);
        }
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
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
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;