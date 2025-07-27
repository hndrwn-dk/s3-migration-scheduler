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
import LoadingSpinner from './components/LoadingSpinner';

import { TabType, Migration } from './types';
import { healthService, migrationService } from './services/api';
import websocketService from './services/websocket';

import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize the application
    initializeApp();

    // Set up WebSocket handlers
    websocketService.onMigrationUpdate(handleMigrationUpdate);
    websocketService.onError(handleWebSocketError);

    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      setConnected(websocketService.isConnected());
    }, 5000);

    return () => {
      clearInterval(connectionCheck);
      websocketService.removeHandler('migration_update');
      websocketService.removeHandler('error');
    };
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Check server health
      await healthService.checkHealth();
      
      // Load existing migrations
      const existingMigrations = await migrationService.getAllMigrations();
      setMigrations(existingMigrations);
      
      setConnected(websocketService.isConnected());
      
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
    toast.error('Connection error - some features may not work properly');
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
        return <Dashboard migrations={migrations} />;
      case 'configure':
        return <ConfigureTab />;
      case 'migrate':
        return <MigrateTab onMigrationStart={handleMigrationStart} />;
      case 'history':
        return <HistoryTab migrations={migrations} onCancel={handleMigrationCancel} />;
      case 'logs':
        return <LogsTab migrations={migrations} />;
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
      <Header connected={connected} />
      
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
