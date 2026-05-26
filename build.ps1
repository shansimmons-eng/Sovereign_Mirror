$ErrorActionPreference = "Continue"
$projectPath = "\\wsl$\Ubuntu\home\retroporter\cup"

Write-Host "Starting build from: $projectPath"

# Change to project directory using pushd to map UNC to drive letter
Push-Location -Path $projectPath
Write-Host "Current location: $(Get-Location)"

# Run TypeScript check
Write-Host "Running TypeScript check..."
& node node_modules/typescript/bin/tsc
if ($LASTEXITCODE -ne 0) {
    Write-Host "TypeScript check failed with exit code: $LASTEXITCODE"
    Pop-Location
    exit 1
}

# Run Vite build
Write-Host "Running Vite build..."
& node node_modules/vite/bin/vite.js build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vite build failed with exit code: $LASTEXITCODE"
    Pop-Location
    exit 1
}

Write-Host "Build completed successfully!"
Pop-Location