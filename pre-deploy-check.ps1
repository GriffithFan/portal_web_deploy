# ==============================================
# Portal Meraki - Pre-Deploy Checklist (PowerShell)
# ==============================================

$ErrorActionPreference = "Continue"

Write-Host "=== Portal Meraki - Pre-Deploy Checklist ===" -ForegroundColor Blue
Write-Host ""

$Errors = 0
$Warnings = 0

# 1. Verificar que .env no esté en el repo
Write-Host "1. Verificando que .env no esté versionado... " -NoNewline
$envInGit = git ls-files --error-unmatch backend/.env 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   El archivo backend/.env está en Git. Debes eliminarlo:" -ForegroundColor Red
    Write-Host "   git rm --cached backend/.env" -ForegroundColor Yellow
    $Errors++
} else {
    Write-Host "OK" -ForegroundColor Green
}

# 2. Verificar que .env.production exista
Write-Host "2. Verificando que .env.production exista... " -NoNewline
if (Test-Path "backend\.env.production") {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   No se encontró backend\.env.production" -ForegroundColor Red
    $Errors++
}

# 3. Verificar que node_modules no esté versionado
Write-Host "3. Verificando que node_modules no esté versionado... " -NoNewline
$backendNodeModules = git ls-files --error-unmatch backend/node_modules 2>$null
$frontendNodeModules = git ls-files --error-unmatch frontend/node_modules 2>$null
if (($LASTEXITCODE -eq 0) -or ($backendNodeModules) -or ($frontendNodeModules)) {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   node_modules está en Git. Debes eliminarlo:" -ForegroundColor Red
    Write-Host "   git rm -r --cached backend/node_modules frontend/node_modules" -ForegroundColor Yellow
    $Errors++
} else {
    Write-Host "OK" -ForegroundColor Green
}

# 4. Verificar que scripts .sh existan (para Ubuntu)
Write-Host "4. Verificando scripts de deploy... " -NoNewline
$scripts = @("deploy-ubuntu.sh", "update.sh", "config-env.sh")
$missingScripts = 0
foreach ($script in $scripts) {
    if (-not (Test-Path $script)) {
        $missingScripts++
    }
}

if ($missingScripts -eq 0) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "   Faltan $missingScripts script(s) de deploy" -ForegroundColor Yellow
    $Warnings++
}

# 5. Verificar que README.md esté actualizado
Write-Host "5. Verificando README.md... " -NoNewline
if ((Test-Path "README.md") -and ((Get-Item "README.md").Length -gt 0)) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "   README.md está vacío o no existe" -ForegroundColor Yellow
    $Warnings++
}

# 6. Verificar que DEPLOY.md exista
Write-Host "6. Verificando DEPLOY.md... " -NoNewline
if (Test-Path "DEPLOY.md") {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "   DEPLOY.md no existe" -ForegroundColor Yellow
    $Warnings++
}

# 7. Verificar estructura de directorios
Write-Host "7. Verificando estructura de directorios... " -NoNewline
$dirs = @("backend\src", "frontend\src", "backend\data")
$missingDirs = 0
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        $missingDirs++
    }
}

if ($missingDirs -eq 0) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   Faltan directorios críticos" -ForegroundColor Red
    $Errors++
}

# 8. Verificar archivos package.json
Write-Host "8. Verificando package.json... " -NoNewline
if ((Test-Path "backend\package.json") -and (Test-Path "frontend\package.json")) {
    Write-Host "OK" -ForegroundColor Green
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   Faltan archivos package.json" -ForegroundColor Red
    $Errors++
}

# 9. Verificar que no haya API keys hardcoded (solo en .env.production está permitido)
Write-Host "9. Verificando API keys hardcoded... " -NoNewline
$hardcodedCount = 0
try {
    $jsFiles = Get-ChildItem -Path . -Include *.js,*.jsx,*.ts,*.tsx -Recurse -Exclude node_modules,dist,build -ErrorAction SilentlyContinue
    foreach ($file in $jsFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ($content -match "abcfebc2a5ae619bebe7fccc42a4e35228fcab86") {
            $hardcodedCount++
        }
    }
} catch {
    # Ignorar errores de lectura
}

if ($hardcodedCount -gt 0) {
    Write-Host "WARNING" -ForegroundColor Yellow
    Write-Host "   Se encontraron posibles API keys en el código" -ForegroundColor Yellow
    Write-Host "   Verifica que solo esté en .env.production" -ForegroundColor Yellow
    $Warnings++
} else {
    Write-Host "OK" -ForegroundColor Green
}

# 10. Verificar que .gitignore esté correcto
Write-Host "10. Verificando .gitignore... " -NoNewline
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if (($gitignoreContent -match "node_modules") -and ($gitignoreContent -match "\.env")) {
        Write-Host "OK" -ForegroundColor Green
    } else {
        Write-Host "WARNING" -ForegroundColor Yellow
        Write-Host "   .gitignore puede estar incompleto" -ForegroundColor Yellow
        $Warnings++
    }
} else {
    Write-Host "FAIL" -ForegroundColor Red
    Write-Host "   No se encontró .gitignore" -ForegroundColor Red
    $Errors++
}

# Resumen
Write-Host ""
Write-Host "=== Resumen ===" -ForegroundColor Blue

if (($Errors -eq 0) -and ($Warnings -eq 0)) {
    Write-Host "ALL OK - Listo para hacer push a GitHub" -ForegroundColor Green
    Write-Host ""
    Write-Host "Comandos sugeridos:" -ForegroundColor Blue
    Write-Host '  git add .' -ForegroundColor Cyan
    Write-Host '  git commit -m "Actualización: mejoras en topología y velocidades ethernet"' -ForegroundColor Cyan
    Write-Host '  git push origin main' -ForegroundColor Cyan
    Write-Host ""
    exit 0
}
elseif ($Errors -eq 0) {
    Write-Host "$Warnings advertencia(s) - Puedes continuar pero revisa" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}
else {
    Write-Host "$Errors error(es) encontrado(s) - Corrige antes de hacer push" -ForegroundColor Red
    Write-Host ""
    exit 1
}
