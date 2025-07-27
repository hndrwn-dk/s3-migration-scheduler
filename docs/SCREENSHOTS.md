# Adding Screenshots to README

This guide explains how to add actual UI screenshots to the README.

## 📸 Required Screenshots

To complete the README documentation, please take the following screenshots:

### 1. Dashboard Overview (`dashboard-overview.png`)
- Navigate to the main dashboard
- Ensure there are some migration statistics visible
- Capture the full dashboard view including:
  - Statistics cards (Total, Completed, Running, Failed)
  - Migration trends chart
  - Status distribution pie chart
  - Recent migrations table

### 2. Configuration Tab (`configuration.png`)
- Navigate to the Configure tab
- Show the S3 endpoint configuration form
- Include any configured aliases in the list
- Capture the connection testing functionality

### 3. Migration Wizard (`migration-wizard.png`)
- Navigate to the Migrate tab
- Show the migration setup form with:
  - Source and destination selection
  - Bucket analysis results
  - Advanced options expanded
  - Validation status

### 4. Progress Monitoring (`progress-monitoring.png`)
- Start a migration or show a running migration
- Capture the real-time progress display:
  - Progress bars
  - Transfer statistics
  - Real-time updates indicator

### 5. Migration History (`migration-history.png`)
- Navigate to the History tab
- Show the migration list with various statuses
- Include the detailed modal view if possible
- Show filtering/sorting options

### 6. Log Viewer (`log-viewer.png`)
- Navigate to the Logs tab
- Select a migration with logs
- Show the live log viewer with:
  - Log filtering options
  - Highlighted error/warning lines
  - Export functionality

## 📝 How to Add Screenshots

1. **Take Screenshots**: Use your browser's screenshot tool or a tool like:
   - macOS: `Cmd + Shift + 4` for selection
   - Windows: `Windows + Shift + S`
   - Linux: `gnome-screenshot -a` or similar

2. **Optimize Images**: 
   - Recommended size: 1200px width maximum
   - Format: PNG for UI screenshots
   - Compress images to keep repository size manageable

3. **Save Images**: Place screenshots in `docs/images/` directory with these exact names:
   - `dashboard-overview.png`
   - `configuration.png`
   - `migration-wizard.png`
   - `progress-monitoring.png`
   - `migration-history.png`
   - `log-viewer.png`

4. **Update README**: Uncomment the image lines in README.md:
   ```markdown
   <!-- ![Dashboard Overview](docs/images/dashboard-overview.png) -->
   ```
   becomes:
   ```markdown
   ![Dashboard Overview](docs/images/dashboard-overview.png)
   ```

5. **Commit and Push**:
   ```bash
   git add docs/images/*.png
   git add README.md
   git commit -m "docs: Add UI screenshots to README"
   git push origin main
   ```

## 🎨 Screenshot Tips

- **Consistent Browser**: Use the same browser for all screenshots
- **Clean State**: Clear browser cache and use fresh data
- **Good Lighting**: Use a consistent theme (light/dark)
- **Hide Sensitive Data**: Blur or remove any sensitive information
- **Professional Look**: Ensure the UI looks clean and professional

## 🚀 Alternative: Live Demo

Consider adding a live demo link instead of or in addition to screenshots:

```markdown
## 🌐 Live Demo

Try the live demo: [S3 Migration Dashboard Demo](https://your-demo-url.com)
```