const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const windowStateKeeper = require('electron-window-state');

// Keep a global reference of the window object
let mainWindow;
let serverProcess;
let isDevelopment = process.env.NODE_ENV === 'development';

// Server configuration
const SERVER_PORT = 5000;
const CLIENT_PORT = 3000;

class S3MigrationApp {
  constructor() {
    this.mainWindow = null;
    this.serverProcess = null;
    this.isQuitting = false;
  }

  async initialize() {
    // Set up application paths
    this.setupPaths();
    
    // Create application window
    await this.createWindow();
    
    // Start backend server
    await this.startServer();
    
    // Set up application events
    this.setupEventHandlers();
    
    // Create application menu
    this.createMenu();
  }

  setupPaths() {
    // Determine if running from development or production
    this.isDev = process.env.NODE_ENV === 'development';
    
    if (this.isDev) {
      this.serverPath = path.join(__dirname, '..', 'server');
      this.clientPath = path.join(__dirname, '..', 'client', 'build');
      this.mcPath = path.join(__dirname, '..', process.platform === 'win32' ? 'mc.exe' : 'mc');
    } else {
      // Production paths
      this.resourcesPath = process.resourcesPath;
      this.serverPath = path.join(this.resourcesPath, 'server');
      this.clientPath = path.join(this.resourcesPath, 'client');
      this.mcPath = path.join(this.resourcesPath, process.platform === 'win32' ? 'mc.exe' : 'mc');
    }

    // App data directory
    this.appDataPath = path.join(app.getPath('userData'), 'S3MigrationScheduler');
    this.dataPath = path.join(this.appDataPath, 'data');
    this.logsPath = path.join(this.appDataPath, 'logs');

    // Ensure directories exist
    fs.ensureDirSync(this.appDataPath);
    fs.ensureDirSync(this.dataPath);
    fs.ensureDirSync(this.logsPath);
  }

  async createWindow() {
    // Load window state
    let mainWindowState = windowStateKeeper({
      defaultWidth: 1400,
      defaultHeight: 900
    });

    // Create the browser window
    this.mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: this.getIconPath(),
      title: 'S3 Migration Scheduler',
      show: false,
      titleBarStyle: 'default'
    });

    // Let windowStateKeeper manage the window
    mainWindowState.manage(this.mainWindow);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }

  getIconPath() {
    const iconName = process.platform === 'win32' ? 'icon.ico' : 
                     process.platform === 'darwin' ? 'icon.icns' : 'icon.png';
    return path.join(__dirname, 'assets', iconName);
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      const serverScript = path.join(this.serverPath, 'index.js');
      
      // Debug: Log paths
      console.log('🔍 Server startup debug info:');
      console.log('  - isDev:', this.isDev);
      console.log('  - serverPath:', this.serverPath);
      console.log('  - serverScript:', serverScript);
      console.log('  - resourcesPath:', this.resourcesPath);
      
      // Check if server script exists
      if (!fs.existsSync(serverScript)) {
        console.error('❌ Server script not found:', serverScript);
        
        // Debug: List contents of server directory
        try {
          if (fs.existsSync(this.serverPath)) {
            console.log('📁 Server directory contents:');
            const files = fs.readdirSync(this.serverPath);
            files.forEach(file => console.log(`  - ${file}`));
          } else {
            console.error('❌ Server directory does not exist:', this.serverPath);
          }
        } catch (error) {
          console.error('❌ Error reading server directory:', error.message);
        }
        
        reject(new Error(`Server script not found: ${serverScript}`));
        return;
      }
      
      // Check if server has node_modules
      const serverNodeModules = path.join(this.serverPath, 'node_modules');
      if (!fs.existsSync(serverNodeModules)) {
        console.warn('⚠️ Server node_modules not found:', serverNodeModules);
        console.warn('⚠️ This may cause server startup issues');
      } else {
        console.log('✅ Server node_modules found');
      }

      // Environment variables for the server
      const env = {
        ...process.env,
        NODE_ENV: this.isDev ? 'development' : 'production',
        PORT: SERVER_PORT,
        DB_PATH: path.join(this.dataPath, 'migrations.db'),
        LOG_PATH: this.logsPath,
        MC_PATH: this.mcPath,
        FRONTEND_URL: `http://localhost:${SERVER_PORT}`,
        ELECTRON_APP: 'true'
      };

      // Start the server process
      this.serverProcess = spawn('node', [serverScript], {
        cwd: this.serverPath,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle server output
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Server: ${output}`);
        
        // Check for server ready indicators
        if (output.includes('Server running on port') || output.includes('Dashboard available at')) {
          console.log('✅ Server startup detected in output');
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`Server Error: ${error}`);
        
        // Check for common error patterns
        if (error.includes('EADDRINUSE')) {
          console.error(`❌ Port ${SERVER_PORT} is already in use`);
        } else if (error.includes('EACCES')) {
          console.error(`❌ Permission denied for port ${SERVER_PORT}`);
        }
      });

      this.serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
        reject(error);
      });

      this.serverProcess.on('close', (code) => {
        console.log(`Server process exited with code ${code}`);
        if (!this.isQuitting) {
          this.showServerErrorDialog();
        }
      });

      // Give server a moment to start, then begin health checks
      console.log('⏳ Starting server, waiting for it to be ready...');
      setTimeout(() => {
        this.checkServerHealth()
          .then(() => {
            console.log('✅ Server started successfully, loading application...');
            this.loadApplication();
            resolve();
          })
          .catch((error) => {
            console.error('❌ Server startup failed:', error.message);
            reject(error);
          });
      }, 2000); // Reduced from 3000ms to 2000ms since we have retry logic
    });
  }

  async checkServerHealth() {
    const http = require('http');
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Health check attempt ${attempt}/${maxRetries}...`);
        
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${SERVER_PORT}/api/health`, (res) => {
            if (res.statusCode === 200) {
              console.log('✅ Server health check passed');
              resolve();
            } else {
              reject(new Error(`Server health check failed: ${res.statusCode}`));
            }
          });

          req.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
              reject(new Error(`Connection refused (attempt ${attempt}/${maxRetries}). Server may still be starting...`));
            } else {
              reject(error);
            }
          });

          req.setTimeout(8000, () => {
            req.destroy();
            reject(new Error(`Health check timeout (attempt ${attempt}/${maxRetries})`));
          });
        });
        
        // If we get here, health check passed
        return;
        
      } catch (error) {
        console.log(`❌ Health check failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          // Show user-friendly error dialog on final failure
          const { dialog } = require('electron');
          const result = await dialog.showMessageBox(null, {
            type: 'error',
            title: 'Server Connection Error',
            message: 'Unable to start the application server',
            detail: `After ${maxRetries} attempts, the application server could not be reached.\n\nThis might happen in corporate environments due to:\n• Network security policies\n• Antivirus software blocking localhost connections\n• Port ${SERVER_PORT} being in use by another application\n\nWould you like to try again or exit?`,
            buttons: ['Try Again', 'Exit Application', 'Open Troubleshooting Guide'],
            defaultId: 0,
            cancelId: 1
          });
          
          if (result.response === 0) {
            // Try again - recursive call
            return this.checkServerHealth();
          } else if (result.response === 2) {
            // Open troubleshooting guide
            const { shell } = require('electron');
            shell.openExternal('https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/TROUBLESHOOTING.md');
            throw new Error('User requested troubleshooting guide');
          } else {
            // Exit application
            throw new Error('User chose to exit application');
          }
        }
        
        // Wait before next attempt (with exponential backoff)
        const delay = retryDelay * Math.min(attempt, 3);
        console.log(`⏳ Waiting ${delay/1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  loadApplication() {
    if (this.isDev) {
      // In development, load from the dev server
      this.mainWindow.loadURL(`http://localhost:${CLIENT_PORT}`);
    } else {
      // In production, serve static files through the backend
      this.mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
    }
  }

  setupEventHandlers() {
    // App event handlers
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
    });

    // IPC handlers
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('get-app-data-path', () => {
      return this.appDataPath;
    });

    ipcMain.handle('show-message-box', async (event, options) => {
      const result = await dialog.showMessageBox(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('show-open-dialog', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('show-save-dialog', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });
  }

  createMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Open Data Directory',
            click: () => {
              shell.openPath(this.appDataPath);
            }
          },
          {
            label: 'Open Logs Directory',
            click: () => {
              shell.openPath(this.logsPath);
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              this.quit();
            }
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About S3 Migration Scheduler',
            click: () => {
              this.showAboutDialog();
            }
          },
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://github.com/hndrwn-dk/s3-migration-scheduler');
            }
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  showAboutDialog() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About S3 Migration Scheduler',
      message: 'S3 Migration Scheduler',
      detail: `Version: ${app.getVersion()}\n\nA comprehensive tool for migrating S3 buckets with scheduling capabilities, real-time monitoring, and detailed reconciliation tracking.`,
      buttons: ['OK']
    });
  }

  showServerErrorDialog() {
    dialog.showErrorBox(
      'Server Error',
      'The backend server has stopped unexpectedly. Please restart the application.'
    );
  }

  quit() {
    this.isQuitting = true;
    
    // Stop the server process
    if (this.serverProcess && !this.serverProcess.killed) {
      console.log('Stopping server process...');
      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (!this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    app.quit();
  }
}

// Initialize the application
const s3App = new S3MigrationApp();

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  s3App.initialize().catch((error) => {
    console.error('Failed to initialize application:', error);
    dialog.showErrorBox('Initialization Error', `Failed to start the application: ${error.message}`);
    app.quit();
  });
});

// Handle app instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (s3App.mainWindow) {
      if (s3App.mainWindow.isMinimized()) s3App.mainWindow.restore();
      s3App.mainWindow.focus();
    }
  });
}

// Export for testing
module.exports = s3App;