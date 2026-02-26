param(
  [switch]$RequireAudioDeps = $true
)

$ErrorActionPreference = 'Stop'

$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Details,
    [string]$Fix
  )
  $results.Add([PSCustomObject]@{
    Name = $Name
    Status = if ($Ok) { 'PASS' } else { 'FAIL' }
    Details = $Details
    Fix = $Fix
  })
}

function Test-CommandExists {
  param([string]$CommandName)
  return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

Write-Host "Checking prerequisites for JavaScript Voice Live quickstarts..." -ForegroundColor Cyan
Write-Host "Location: $PWD" -ForegroundColor DarkGray

# Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $nodeVersionRaw = (& node -v).Trim()
  $nodeVersionClean = $nodeVersionRaw.TrimStart('v')
  $major = [int]($nodeVersionClean.Split('.')[0])
  $nodeOk = $major -ge 18 -and $major -le 22
  Add-Result -Name 'Node.js' -Ok $nodeOk -Details "Detected $nodeVersionRaw" -Fix 'Install Node.js LTS (18 or 20): winget install OpenJS.NodeJS.LTS'
} else {
  Add-Result -Name 'Node.js' -Ok $false -Details 'node not found on PATH' -Fix 'Install Node.js LTS (18 or 20): winget install OpenJS.NodeJS.LTS'
}

# npm
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($npmCmd) {
  $npmVersion = (& npm -v).Trim()
  Add-Result -Name 'npm' -Ok $true -Details "Detected $npmVersion" -Fix ''
} else {
  Add-Result -Name 'npm' -Ok $false -Details 'npm not found on PATH' -Fix 'Reinstall Node.js LTS so npm is included'
}

# SoX
$soxOk = Test-CommandExists -CommandName 'sox'
if ($soxOk) {
  $soxVersion = (& sox --version 2>$null | Select-Object -First 1)
  $soxDetails = if ([string]::IsNullOrWhiteSpace($soxVersion)) { 'sox found' } else { $soxVersion }
  Add-Result -Name 'SoX' -Ok $true -Details $soxDetails -Fix ''
} else {
  Add-Result -Name 'SoX' -Ok $false -Details 'sox not found on PATH' -Fix 'Install SoX: winget install --id ChrisBagwell.SoX -e'
}

# Visual Studio Build Tools / C++ workload
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path $vswhere) {
  $vcInstall = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($vcInstall)) {
    $sdkInstall = & $vswhere -latest -products * -requiresAny -requires Microsoft.VisualStudio.Component.Windows10SDK.19041 Microsoft.VisualStudio.Component.Windows11SDK.22621 Microsoft.VisualStudio.Component.Windows11SDK.26100 -property installationPath
    $sdkOk = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($sdkInstall)
    Add-Result -Name 'VS C++ Build Tools' -Ok $true -Details "Detected at $vcInstall" -Fix ''
    if ($sdkOk) {
      Add-Result -Name 'Windows SDK component' -Ok $true -Details 'Windows SDK component detected' -Fix ''
    } else {
      Add-Result -Name 'Windows SDK component' -Ok $false -Details 'Windows SDK component not detected by vswhere requires query' -Fix 'Open Visual Studio Installer > Modify Build Tools > Desktop development with C++ and ensure latest Windows 10/11 SDK is checked'
    }
  } else {
    Add-Result -Name 'VS C++ Build Tools' -Ok $false -Details 'MSVC C++ tools not detected' -Fix 'Install Build Tools workload: winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
  }
} else {
  Add-Result -Name 'vswhere' -Ok $false -Details 'vswhere.exe not found' -Fix 'Install Build Tools: winget install --id Microsoft.VisualStudio.2022.BuildTools -e'
  Add-Result -Name 'VS C++ Build Tools' -Ok $false -Details 'Cannot verify without vswhere' -Fix 'Install Build Tools workload: winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
}

# npm modules in this project
$pkgJson = Join-Path $PWD 'package.json'
if (-not (Test-Path $pkgJson)) {
  Add-Result -Name 'Quickstart folder' -Ok $false -Details 'package.json not found in current directory' -Fix 'Run this script from a quickstart folder (e.g. ModelQuickstart or AgentsNewQuickstart)'
} else {
  if ($RequireAudioDeps) {
    $speakerOk = Test-Path (Join-Path $PWD "node_modules\speaker")
    $recordOk = Test-Path (Join-Path $PWD "node_modules\node-record-lpcm16")
    $recordDetails = if ($recordOk) { 'Installed' } else { 'Missing' }
    $speakerDetails = if ($speakerOk) { 'Installed' } else { 'Missing (likely native build failure)' }
    Add-Result -Name 'node-record-lpcm16' -Ok $recordOk -Details $recordDetails -Fix 'Install deps: npm install --include=optional'
    Add-Result -Name 'speaker' -Ok $speakerOk -Details $speakerDetails -Fix 'Install C++ build tools first, then run: npm install --include=optional'
  }
}

Write-Host ""
Write-Host "Prerequisite check summary:" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$fails = @($results | Where-Object { $_.Status -eq 'FAIL' })
if ($fails.Count -gt 0) {
  Write-Host "" 
  Write-Host "Fix commands / actions:" -ForegroundColor Yellow
  $fails | Select-Object -Unique Fix | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Fix) } | ForEach-Object {
    Write-Host "- $($_.Fix)"
  }
  exit 1
}

Write-Host ""
Write-Host "All required prerequisites are installed." -ForegroundColor Green
exit 0
