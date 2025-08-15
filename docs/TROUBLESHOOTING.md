# S3 Migration Scheduler - Troubleshooting Guide

## 🚨 Common Startup Issues

### Connection Refused (ECONNREFUSED) Error

**Symptoms:**
- Error popup showing "CONREFUSE 127" or "ECONNREFUSED 127.0.0.1:5000"
- Application shows error then works after a moment
- Slow startup in corporate environments

**Root Cause:**
The frontend is trying to connect to the backend server before it's fully ready.

**Solutions:**

#### 1. **Wait for Startup** (Most Common)
- The application has built-in retry logic (10 attempts over 20 seconds)
- Simply wait for the startup process to complete
- You should see the application load automatically after the retries succeed

#### 2. **Corporate Environment Issues**

**Network Security Policies:**
- Some corporate networks block localhost connections
- Firewall may be blocking port 5000
- Proxy settings might interfere

**Antivirus Software:**
- Antivirus may block the server process
- Real-time protection might scan the executable
- Add S3 Migration Scheduler to antivirus exceptions

**Port Conflicts:**
- Port 5000 might be used by another application
- Check if any corporate software uses port 5000

#### 3. **Fixes for Corporate Environments**

**Option A: Change Default Port**
1. Close the application
2. Navigate to the application directory
3. Create/edit `.env` file in the server folder:
   ```
   PORT=5001
   ```
4. Restart the application

**Option B: Windows Firewall Exception**
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change Settings" then "Allow another app"
4. Browse to S3 Migration Scheduler executable
5. Allow for both Private and Public networks

**Option C: Antivirus Exception**
1. Open your antivirus software
2. Add the application folder to exceptions:
   - `C:\Program Files\S3 Migration Scheduler\` (if installed)
   - Or your portable app location
3. Add process exceptions for:
   - `s3-migration-scheduler.exe`
   - `node.exe`

## 🔧 Advanced Troubleshooting

### 1. **Port Already in Use (EADDRINUSE)**

**Error:** `Port 5000 is already in use`

**Check what's using the port:**
```bash
# Windows
netstat -ano | findstr :5000

# Linux/Mac
lsof -i :5000
```

**Solution:**
- Kill the process using the port, OR
- Change the port in `.env` file:
  ```
  PORT=5001
  ```

### 2. **Permission Denied (EACCES)**

**Error:** `Permission denied for port 5000`

**Solutions:**
- Run as administrator (Windows)
- Use a port number above 1024
- Check corporate IT policies

### 3. **Server Won't Start**

**Check server logs:**
- Desktop app: Look at console output when running from terminal
- Logs are saved in: `%APPDATA%/s3-migration-scheduler/logs/`

**Common issues:**
- Missing Node.js (for source builds)
- Corrupted database file
- Insufficient disk space

### 4. **Database Issues**

**Symptoms:**
- Application starts but no data loads
- Migration history is empty
- Configuration doesn't save

**Solution:**
1. Close the application
2. Navigate to data directory:
   - Windows: `%APPDATA%/s3-migration-scheduler/data/`
   - Linux: `~/.local/share/s3-migration-scheduler/data/`
3. Backup then delete `migrations.db`
4. Restart application (will create new database)

## 🏢 Corporate Environment Best Practices

### 1. **IT Department Coordination**

**Inform IT about:**
- Application uses localhost ports (default: 5000)
- Needs to create temporary files for MinIO client
- Requires network access to S3 endpoints
- Uses SQLite database locally (no external DB needed)

**Request exceptions for:**
- Windows Defender / Corporate antivirus
- Network firewall rules for localhost:5000
- File system access for application data directory

### 2. **Proxy and Network Settings**

**If behind corporate proxy:**
- The application connects directly to S3 endpoints
- Localhost connections should bypass proxy
- Configure S3 endpoints with proxy settings if needed

### 3. **Installation Options for Corporate**

**Option 1: Portable Version (Recommended)**
- No administrator rights required
- Can be placed on network drives
- Easier for IT to approve

**Option 2: Docker Deployment**
- Run on corporate Docker infrastructure
- Better isolation and security
- Easier for IT to manage

## 🚀 Quick Fixes Summary

### Issue: Connection refused error on startup
**Solution:** Wait 30 seconds for automatic retry, or restart application

### Issue: Application won't start at all
**Solution:** 
1. Run as administrator
2. Check antivirus exceptions
3. Try different port in `.env` file

### Issue: Slow startup in corporate environment
**Solution:**
1. Add to antivirus exceptions
2. Request IT to whitelist application
3. Use portable version instead of installer

### Issue: Can't connect to S3 endpoints
**Solution:**
1. Check corporate proxy settings
2. Verify S3 endpoint URLs
3. Test connectivity with corporate IT

## 📞 Getting Help

### 1. **Collect Information**
Before reporting issues, collect:
- Operating system and version
- Application version
- Error messages (screenshots helpful)
- Corporate environment details (antivirus, proxy, etc.)

### 2. **Diagnostic Commands**

**Check port availability:**
```bash
# Windows
telnet localhost 5000

# Linux/Mac
nc -zv localhost 5000
```

**Check application logs:**
- Look in `%APPDATA%/s3-migration-scheduler/logs/`
- Or enable console output by running from terminal

### 3. **Support Channels**
- **GitHub Issues**: [Report bugs](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- **GitHub Discussions**: [Ask questions](https://github.com/hndrwn-dk/s3-migration-scheduler/discussions)
- **Documentation**: [Check latest docs](https://github.com/hndrwn-dk/s3-migration-scheduler/docs/)

## 🔐 Security Considerations

### Corporate Security Compliance
- Application stores data locally (no cloud dependencies)
- Uses encrypted connections to S3 endpoints
- No telemetry or data collection
- Open source - can be audited by security teams

### Data Privacy
- All data stays within corporate network
- No external API calls except to configured S3 endpoints
- Database and logs stored locally

### Audit Trail
- Complete migration history stored in SQLite
- Detailed logs for all operations
- No data retention policies (you control all data)

---

**Need more help?** 
[Open a GitHub issue](https://github.com/hndrwn-dk/s3-migration-scheduler/issues) with your specific environment details.