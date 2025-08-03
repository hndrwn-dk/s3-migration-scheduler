import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ConfigureTab from './components/ConfigureTab';
import MigrateTab from './components/MigrateTab';
import HistoryTab from './components/HistoryTab';
import LogsTab from './components/LogsTab';
import ScheduledTab from './components/ScheduledTab';
import LoadingSpinner from './components/LoadingSpinner';

import { TabType, Migration } from './types';
import { healthService, migrationService } from './services/api';
import websocketService from './services/websocket';
import sseService from './services/sse';

import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<'websocket' | 'sse' | 'none'>('none');

  useEffect(() => {
    // Initialize the application
    initializeApp();

    // Set up WebSocket handlers first
    websocketService.onMigrationUpdate(handleMigrationUpdate);
    websocketService.onError(handleWebSocketError);

    // Set up SSE handlers as fallback
    sseService.onInitialData(handleInitialData);
    sseService.onMigrationUpdate(handleMigrationUpdate);
    sseService.onError(handleSSEError);

    // Check connection status periodically and manage fallback
    const connectionCheck = setInterval(() => {
      const wsConnected = websocketService.isConnected();
      const sseConnected = sseService.isConnected();
      
      if (wsConnected) {
        setConnected(true);
        setConnectionType('websocket');
      } else if (sseConnected) {
        setConnected(true);
        setConnectionType('sse');
      } else {
        setConnected(false);
        setConnectionType('none');
      }
    }, 2000);

    return () => {
      clearInterval(connectionCheck);
      websocketService.removeHandler('migration_update');
      websocketService.removeHandler('error');
      sseService.removeHandler('initial_data');
      sseService.removeHandler('migration_update');
      sseService.removeHandler('error');
    };
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Check server health
      await healthService.checkHealth();
      
      // Load existing migrations from API (primary method for refresh persistence)
      try {
        const existingMigrations = await migrationService.getAllMigrations();
        console.log(`🔄 API loaded ${existingMigrations.length} migrations on refresh`);
        setMigrations(existingMigrations);
        
        if (existingMigrations.length > 0) {
          console.log('Successfully restored migrations from database on refresh');
        } else {
          console.log('No existing migrations found in database');
        }
      } catch (error) {
        console.error('Failed to load migrations from API:', error);
        toast.error('Failed to load existing migrations. Real-time updates will still work.');
      }
      
      toast.success('Connected to S3 Migration Dashboard');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      toast.error(`Failed to connect to server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMigrationUpdate = (migrationData: any) => {
    setMigrations(prev => {
      const existingIndex = prev.findIndex(m => m.id === migrationData.id);
      if (existingIndex >= 0) {
        // Update existing migration
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...migrationData };
        return updated;
      } else {
        // Add new migration (this shouldn't happen normally)
        return [...prev, migrationData];
      }
    });

    // Show notifications for important status changes
    if (migrationData.status === 'completed') {
      toast.success(`Migration ${migrationData.id.slice(0, 8)} completed successfully!`);
    } else if (migrationData.status === 'failed') {
      toast.error(`Migration ${migrationData.id.slice(0, 8)} failed!`);
    } else if (migrationData.status === 'verified') {
      toast.success(`Migration ${migrationData.id.slice(0, 8)} completed and verified!`);
    }
  };

  const handleWebSocketError = (error: any) => {
    console.error('WebSocket error:', error);
    // Don't show error if SSE is working
    if (!sseService.isConnected()) {
      toast.error('Connection error - trying alternative connection method');
    }
  };

  const handleSSEError = (error: any) => {
    console.error('SSE error:', error);
    // Only show error if WebSocket is also not working
    if (!websocketService.isConnected()) {
      toast.error('Connection error - some features may not work properly');
    }
  };

  const handleInitialData = (migrations: Migration[]) => {
    console.log(`Received initial migration data from SSE: ${migrations.length} migrations`);
    setMigrations(migrations);
  };

  const handleMigrationStart = (migration: Migration) => {
    setMigrations(prev => [migration, ...prev]);
    toast.info(`Migration ${migration.id.slice(0, 8)} started`);
  };

  const handleMigrationCancel = async (migrationId: string) => {
    try {
      await migrationService.cancelMigration(migrationId);
      toast.info(`Migration ${migrationId.slice(0, 8)} cancelled`);
    } catch (error) {
      toast.error(`Failed to cancel migration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard migrations={migrations} onTabChange={setActiveTab} />;
      case 'configure':
        return <ConfigureTab />;
      case 'migrate':
        return <MigrateTab onMigrationStart={handleMigrationStart} />;
      case 'history':
        return <HistoryTab migrations={migrations} onCancel={handleMigrationCancel} />;
      case 'logs':
        return <LogsTab migrations={migrations} />;
      case 'scheduled':
        return <ScheduledTab onRefresh={initializeApp} />;
      default:
        return <Dashboard migrations={migrations} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading S3 Migration Dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header connected={connected} connectionType={connectionType} />
      
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 p-6">
          {renderActiveTab()}
        </main>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;
