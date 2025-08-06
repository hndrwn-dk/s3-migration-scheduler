# 🔧 Quick Manual Windows Build Guide

## 🚨 **Your Issue: Script Stops After npm Version Check**

The script is stopping after checking versions, which means there's likely an issue with the first npm install step.

---

## 🎯 **Manual Build Steps (Run These One by One)**

### **Step 1: Check What's Actually Happening**
```powershell
# Let's see if there are any obvious issues
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install --verbose
```

### **Step 2: If npm install fails, try these fixes:**

#### **Option A: Clear npm cache**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm cache clean --force
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install
```

#### **Option B: Delete node_modules and reinstall**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install
```

#### **Option C: Use different registry**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install --registry https://registry.npmjs.org/
```

### **Step 3: Manual Build Process (After dependencies are fixed)**

#### **Build Frontend:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> cd client
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm install
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm run build
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> cd ..
```

#### **Prepare Electron App:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> cd electron-app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npm install
```

#### **Copy Frontend to Electron:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> Copy-Item -Recurse ..\client\build .\build
```

#### **Build Windows App:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npx electron-builder --win
```

#### **Check Results:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> dir dist
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> cd ..
```

---

## 🔍 **Diagnostic Commands**

### **Check package.json issues:**
```powershell
# Check if package.json is valid
PS C:\Users\hendr\Deployment\s3-migration-scheduler> Get-Content package.json | ConvertFrom-Json

# Check client package.json
PS C:\Users\hendr\Deployment\s3-migration-scheduler> Get-Content client\package.json | ConvertFrom-Json

# Check electron package.json  
PS C:\Users\hendr\Deployment\s3-migration-scheduler> Get-Content electron-app\package.json | ConvertFrom-Json
```

### **Check for permission issues:**
```powershell
# Run PowerShell as Administrator and try:
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install --verbose
```

### **Check disk space:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="Size(GB)";Expression={[math]::round($_.Size/1GB,2)}}, @{Name="FreeSpace(GB)";Expression={[math]::round($_.FreeSpace/1GB,2)}}
```

---

## ⚡ **Quick Alternative: Skip Root Dependencies**

If root npm install is the problem, you can skip it and build directly:

### **Alternative Build Process:**
```powershell
# Skip root dependencies, go directly to client
PS C:\Users\hendr\Deployment\s3-migration-scheduler> cd client
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm install
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm run build
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> cd ..\electron-app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npm install
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> Copy-Item -Recurse ..\client\build .\build
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npx electron-builder --win
```

---

## 🚀 **Super Simple One-Line Commands**

Try these individual commands to see which one fails:

```powershell
# Test 1: Root install
npm install

# Test 2: Client install
cd client && npm install && cd ..

# Test 3: Client build
cd client && npm run build && cd ..

# Test 4: Electron install
cd electron-app && npm install && cd ..

# Test 5: Copy files
cd electron-app && Copy-Item -Recurse ..\client\build .\build && cd ..

# Test 6: Build Windows app
cd electron-app && npx electron-builder --win && cd ..
```

---

## 🎯 **Most Likely Solutions**

### **Solution 1: Permission Issue**
```powershell
# Run PowerShell as Administrator:
# Right-click PowerShell → "Run as administrator"
# Then try the build again
```

### **Solution 2: Network/Firewall Issue**
```powershell
# Try different registry
npm config set registry https://registry.npmjs.org/
npm install
```

### **Solution 3: Corrupt npm cache**
```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
```

### **Solution 4: Long path issue (Windows)**
```powershell
# Enable long paths in Windows
# Run as Administrator:
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

---

## 💡 **Next Steps**

1. **Try the diagnostic commands** to see what's failing
2. **Run manual build steps** one by one
3. **Report which specific step fails** for targeted help
4. **Try the alternative build process** if root dependencies are the issue

**Start with this command to see the exact error:**
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install --verbose
```

This will show you exactly what's happening and where it's failing! 🔍