const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

let wss = null;
const clients = new Map();

function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    clients.set(clientId, {
      ws,
      subscriptions: new Set()
    });

    console.log(`📡 Client connected: ${clientId}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleClientMessage(clientId, data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`📡 Client disconnected: ${clientId}`);
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      clients.delete(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      clientId,
      message: 'Connected to S3 Migration Dashboard'
    }));
  });

  return wss;
}

function handleClientMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'subscribe':
      if (data.topic) {
        client.subscriptions.add(data.topic);
        console.log(`Client ${clientId} subscribed to ${data.topic}`);
      }
      break;
    
    case 'unsubscribe':
      if (data.topic) {
        client.subscriptions.delete(data.topic);
        console.log(`Client ${clientId} unsubscribed from ${data.topic}`);
      }
      break;
    
    default:
      console.log(`Unknown message type from client ${clientId}:`, data.type);
  }
}

function broadcast(message, topic = null) {
  const data = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...message
  });

  clients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      // If topic is specified, only send to subscribed clients
      if (!topic || client.subscriptions.has(topic)) {
        try {
          client.ws.send(data);
        } catch (error) {
          console.error(`Error sending message to client ${clientId}:`, error);
          clients.delete(clientId);
        }
      }
    }
  });
}

function sendToClient(clientId, message) {
  const client = clients.get(clientId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    try {
      client.ws.send(JSON.stringify({
        timestamp: new Date().toISOString(),
        ...message
      }));
    } catch (error) {
      console.error(`Error sending message to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  }
}

function getConnectedClients() {
  return Array.from(clients.keys());
}

module.exports = {
  initializeWebSocket,
  broadcast,
  sendToClient,
  getConnectedClients
};