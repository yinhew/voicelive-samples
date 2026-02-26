param(
  [string]$NodeVersion = "20.18.0",
  [switch]$SkipWingetInstall,
  [switch]$SkipNpmInstall,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "\n=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Action {
  param(
    [string]$Description,
    [scriptblock]$Action
  )

  if ($DryRun) {
    Write-Host "[DRY-RUN] $Description" -ForegroundColor Yellow
    return
  }

  & $Action
}

function Test-RequiredCommand {
  param([string]$Name, [string]$InstallHint)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command '$Name'. $InstallHint"
  }
}

function Update-SessionPathFromRegistry {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Add-ToUserPathIfMissing {
  param([string]$PathToAdd)
  if ([string]::IsNullOrWhiteSpace($PathToAdd) -or -not (Test-Path $PathToAdd)) {
    return
  }

  $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ([string]::IsNullOrWhiteSpace($currentUserPath)) {
    Invoke-Action -Description "Set user PATH = $PathToAdd" -Action {
      [Environment]::SetEnvironmentVariable("Path", $PathToAdd, "User")
    }
  } else {
    $parts = $currentUserPath.Split(";") | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
    if ($parts -notcontains $PathToAdd) {
      Invoke-Action -Description "Append to user PATH: $PathToAdd" -Action {
        [Environment]::SetEnvironmentVariable("Path", "$currentUserPath;$PathToAdd", "User")
      }
    }
  }

  if (-not (($env:Path -split ";") -contains $PathToAdd)) {
    $env:Path = "$PathToAdd;$env:Path"
  }
}

function Initialize-NvmEnvironment {
  $nvmHomeUser = [Environment]::GetEnvironmentVariable("NVM_HOME", "User")
  $nvmSymlinkUser = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "User")

  if ([string]::IsNullOrWhiteSpace($nvmHomeUser)) {
    $fallbacks = @(
      "C:\Users\jagoerge\AppData\Local\nvm",
      "$env:LOCALAPPDATA\nvm",
      "C:\Program Files\nvm"
    )
    $detected = $fallbacks | Where-Object { Test-Path (Join-Path $_ "nvm.exe") } | Select-Object -First 1
    if (-not [string]::IsNullOrWhiteSpace($detected)) {
      Invoke-Action -Description "Set user env NVM_HOME=$detected" -Action {
        [Environment]::SetEnvironmentVariable("NVM_HOME", $detected, "User")
      }
      $nvmHomeUser = $detected
    }
  }

  if ([string]::IsNullOrWhiteSpace($nvmSymlinkUser)) {
    $defaultSymlink = "C:\Program Files\nodejs"
    Invoke-Action -Description "Set user env NVM_SYMLINK=$defaultSymlink" -Action {
      [Environment]::SetEnvironmentVariable("NVM_SYMLINK", $defaultSymlink, "User")
    }
    $nvmSymlinkUser = $defaultSymlink
  }

  if (-not [string]::IsNullOrWhiteSpace($nvmHomeUser)) {
    $env:NVM_HOME = $nvmHomeUser
    Add-ToUserPathIfMissing -PathToAdd $nvmHomeUser
  }
  if (-not [string]::IsNullOrWhiteSpace($nvmSymlinkUser)) {
    $env:NVM_SYMLINK = $nvmSymlinkUser
    Add-ToUserPathIfMissing -PathToAdd $nvmSymlinkUser
  }
}

function Install-WingetPackage {
  param([string]$Id, [string]$Extra = "")
  $cmd = "winget install --id $Id -e --accept-package-agreements --accept-source-agreements"
  if (-not [string]::IsNullOrWhiteSpace($Extra)) {
    $cmd = "$cmd $Extra"
  }
  Write-Host $cmd -ForegroundColor DarkGray
  Invoke-Action -Description $cmd -Action {
    Invoke-Expression $cmd
  }
}

function Install-Node20WithNvm {
  param([string]$Version)

  Write-Step "Ensuring nvm-windows is available"
  $hasNvm = $null -ne (Get-Command nvm -ErrorAction SilentlyContinue)
  if (-not $hasNvm) {
    if ($DryRun) {
      Write-Host "[DRY-RUN] nvm not currently installed; would install via winget and then run nvm install/use." -ForegroundColor Yellow
      Install-WingetPackage -Id "CoreyButler.NVMforWindows"
      Write-Host "[DRY-RUN] Skipping nvm execution because nvm is not currently available in this shell." -ForegroundColor Yellow
      return
    }

    if ($SkipWingetInstall) {
      throw "nvm is not installed and -SkipWingetInstall was specified."
    }
    Install-WingetPackage -Id "CoreyButler.NVMforWindows"
    Update-SessionPathFromRegistry
  }

  Initialize-NvmEnvironment
  Test-RequiredCommand -Name "nvm" -InstallHint "Install nvm-windows: winget install --id CoreyButler.NVMforWindows -e"

  Write-Step "Installing and activating Node $Version"
  Invoke-Action -Description "nvm install $Version" -Action {
    & nvm install $Version | Out-Host
  }
  Invoke-Action -Description "nvm use $Version" -Action {
    & nvm use $Version | Out-Host
  }

  $nvmHome = [Environment]::GetEnvironmentVariable("NVM_HOME", "User")
  $nvmSymlink = [Environment]::GetEnvironmentVariable("NVM_SYMLINK", "User")

  if (-not [string]::IsNullOrWhiteSpace($nvmHome)) { Add-ToUserPathIfMissing -PathToAdd $nvmHome }
  if (-not [string]::IsNullOrWhiteSpace($nvmSymlink)) { Add-ToUserPathIfMissing -PathToAdd $nvmSymlink }

  Update-SessionPathFromRegistry
  if (-not [string]::IsNullOrWhiteSpace($nvmHome)) { Add-ToUserPathIfMissing -PathToAdd $nvmHome }
  if (-not [string]::IsNullOrWhiteSpace($nvmSymlink)) { Add-ToUserPathIfMissing -PathToAdd $nvmSymlink }

  if ($DryRun) {
    Write-Host "[DRY-RUN] Skipping runtime node version verification" -ForegroundColor Yellow
    return
  }

  Test-RequiredCommand -Name "node" -InstallHint "Node was not found after nvm use. Open a new shell and retry."
  $nodeVersion = (& node -v).Trim()
  Write-Host "Active Node version: $nodeVersion" -ForegroundColor Green

  $major = [int]($nodeVersion.TrimStart('v').Split('.')[0])
  if ($major -ne 20) {
    throw "Expected Node major 20 but found $nodeVersion. Open a new shell and run: nvm use $Version"
  }
}

function Install-SoxIfNeeded {
  Write-Step "Ensuring SoX is installed"
  $hasSox = $null -ne (Get-Command sox -ErrorAction SilentlyContinue)
  if (-not $hasSox) {
    if ($DryRun) {
      Write-Host "[DRY-RUN] sox not currently installed; would install via winget and append installed path." -ForegroundColor Yellow
      Install-WingetPackage -Id "ChrisBagwell.SoX"
      Write-Host "[DRY-RUN] Skipping sox version check because sox is not currently available in this shell." -ForegroundColor Yellow
      return
    }

    if ($SkipWingetInstall) {
      throw "SoX is not installed and -SkipWingetInstall was specified."
    }
    Install-WingetPackage -Id "ChrisBagwell.SoX"
    Update-SessionPathFromRegistry

    $pkgRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
    if (Test-Path $pkgRoot) {
      $soxExe = Get-ChildItem $pkgRoot -Recurse -Filter sox.exe -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
      if ($soxExe) {
        Add-ToUserPathIfMissing -PathToAdd $soxExe.DirectoryName
      }
    }
  }

  if ($DryRun) {
    Write-Host "[DRY-RUN] Skipping runtime sox verification" -ForegroundColor Yellow
    return
  }

  Test-RequiredCommand -Name "sox" -InstallHint "Install SoX: winget install --id ChrisBagwell.SoX -e"
  $soxVersion = (& sox --version | Select-Object -First 1)
  Write-Host "Detected $soxVersion" -ForegroundColor Green
}

function Install-BuildToolsIfNeeded {
  Write-Step "Ensuring Visual Studio Build Tools C++ workload"
  if (-not $SkipWingetInstall) {
    $overrideArgs = "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    Invoke-Action -Description "winget install BuildTools + VCTools workload" -Action {
      & winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-package-agreements --accept-source-agreements --override $overrideArgs | Out-Host
    }
  }

  if ($DryRun) {
    Write-Host "[DRY-RUN] Would verify VS Build Tools and add MSVC bin path to user PATH" -ForegroundColor Yellow
    return
  }

  $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
  if (-not (Test-Path $vswhere)) {
    throw "vswhere.exe not found. Install Visual Studio Build Tools 2022."
  }

  $vcInstall = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  if ([string]::IsNullOrWhiteSpace($vcInstall)) {
    throw "MSVC tools not detected. Ensure 'Desktop development with C++' workload is installed."
  }

  Write-Host "Detected Build Tools at: $vcInstall" -ForegroundColor Green

  $vcToolsDir = Join-Path $vcInstall "VC\Tools\MSVC"
  if (Test-Path $vcToolsDir) {
    $latestMsvc = Get-ChildItem $vcToolsDir -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if ($latestMsvc) {
      $clPath = Join-Path $latestMsvc.FullName "bin\Hostx64\x64"
      Add-ToUserPathIfMissing -PathToAdd $clPath
    }
  }
}

function Install-ProjectDeps {
  Write-Step "Installing project dependencies (including optional audio deps)"
  if ($SkipNpmInstall) {
    Write-Host "Skipping npm install due to -SkipNpmInstall" -ForegroundColor Yellow
    return
  }

  Invoke-Action -Description "npm install --include=optional" -Action {
    & npm install --include=optional | Out-Host
  }

  if (-not $DryRun) {
    & npm ls speaker node-record-lpcm16 --depth=0 | Out-Host
  } else {
    Write-Host "[DRY-RUN] Would run: npm ls speaker node-record-lpcm16 --depth=0" -ForegroundColor Yellow
  }
}

function Invoke-Checks {
  Write-Step "Running prerequisite checker"
  if ($DryRun) {
    Write-Host "[DRY-RUN] Would run: powershell -ExecutionPolicy Bypass -File .\\check-prereqs.ps1" -ForegroundColor Yellow
  } else {
    $checkerPath = Join-Path $PSScriptRoot 'check-prereqs.ps1'
    & powershell -ExecutionPolicy Bypass -File $checkerPath
  }
}

try {
  Write-Step "Validating winget"
  Test-RequiredCommand -Name "winget" -InstallHint "Install winget/App Installer and retry."

  if ($DryRun) {
    Write-Host "Dry-run mode enabled: no installs or permanent PATH changes will be performed." -ForegroundColor Yellow
  }

  Write-Step "Working directory"
  Write-Host "Using: $PWD"

  Install-Node20WithNvm -Version $NodeVersion
  Install-SoxIfNeeded
  Install-BuildToolsIfNeeded
  Install-ProjectDeps
  Invoke-Checks

  Write-Host "\nSetup complete." -ForegroundColor Green
}
catch {
  Write-Host "\nSetup failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "If tools were just installed, close and reopen VS Code terminal, then rerun this script." -ForegroundColor Yellow
  exit 1
}
