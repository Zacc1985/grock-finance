# Auto-commit script for Grock Finance
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Auto-commit: $timestamp"

# Add all changes
git add .

# Commit changes
git commit -m "$commitMessage"

# Push to remote repository
git push origin main

Write-Host "Changes committed and pushed successfully!" 