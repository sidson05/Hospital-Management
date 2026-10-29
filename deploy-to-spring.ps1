# Build React Frontend and deploy to Spring Boot static resources
Write-Host "Building React frontend..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Syncing built assets into Spring Boot static directories..." -ForegroundColor Green
    $destSrc = "$PSScriptRoot\src\main\resources\static"
    $destTarget = "$PSScriptRoot\target\classes\static"

    # Remove older static files if needed
    if (Test-Path $destSrc) {
        Remove-Item -Recurse -Force "$destSrc\assets", "$destSrc\index.html" -ErrorAction SilentlyContinue
    }
    Copy-Item -Recurse -Force "$PSScriptRoot\frontend\dist\*" $destSrc

    if (Test-Path $destTarget) {
        Copy-Item -Recurse -Force "$PSScriptRoot\frontend\dist\*" $destTarget
    }

    Write-Host "Successfully synced frontend build to Spring Boot static directory!" -ForegroundColor Green
} else {
    Write-Host "Frontend build failed. Please inspect build errors." -ForegroundColor Red
}
Set-Location -Path $PSScriptRoot
