# Deploy to Movement Mainnet
# Usage: .\deploy_mainnet.ps1

Write-Host "=== Movement Mainnet Deployment Helper ===" -ForegroundColor Cyan

# Check CLI
if (-not (Get-Command "aptos" -ErrorAction SilentlyContinue)) {
    Write-Error "Aptos CLI is not installed or not in PATH."
    exit 1
}

$RPC_URL = "https://mainnet.movementnetwork.xyz/v1"
$CHAIN_ID = "126"

Write-Host "Configuration:"
Write-Host "RPC URL: $RPC_URL"
Write-Host "Chain ID: $CHAIN_ID"
Write-Host ""

# Ask for address
$address = Read-Host "Enter your Movement Mainnet Wallet Address (where you have MOVE tokens)"
if ([string]::IsNullOrWhiteSpace($address)) {
    Write-Error "Address is required."
    exit 1
}

# Ask for Private Key (Securely)
Write-Host "Enter your Private Key (Input will be hidden):" -ForegroundColor Yellow
$secureKey = Read-Host -AsSecureString
$privateKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey))

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    Write-Error "Private key is required for deployment."
    exit 1
}

# Create a temporary profile for deployment
Write-Host "Initializing temporary profile..." -ForegroundColor Gray
$tempDir = New-Item -ItemType Directory -Path "temp_deploy_profile" -Force
$env:APTOS_CONFIG_DIR = $tempDir.FullName

# Init with private key
try {
    # aptos init requires interactive input usually, but we can pass args
    # --private-key argument allows non-interactive init
    # Note: Removed --chain-id as it is not supported in newer CLI versions for init
    aptos init --network custom --rest-url $RPC_URL --private-key $privateKey --assume-yes
} catch {
    Write-Error "Failed to initialize profile. Check your private key."
    Remove-Item -Path $tempDir -Recurse -Force
    exit 1
}

# Publish
Write-Host "Publishing MoveFeedV3 contract..." -ForegroundColor Cyan
Set-Location "move"

try {
    # Added --bytecode-version 6 for Movement Mainnet compatibility
    aptos move publish --named-addresses tipjar_addr=$address --url $RPC_URL --assume-yes --bytecode-version 6
    
    Write-Host ""
    Write-Host "✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "Please update src/lib/movement.ts with:" -ForegroundColor Yellow
    Write-Host "moduleAddress: ""$address""" -ForegroundColor White
} catch {
    Write-Error "Deployment failed. Check if you have enough MOVE tokens for gas."
    Write-Error $_
}

# Cleanup
Set-Location ..
Remove-Item -Path $tempDir -Recurse -Force
$env:APTOS_CONFIG_DIR = ""

Write-Host "Done."
