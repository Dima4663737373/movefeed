# Building Movement CLI in WSL

## Current Status
✅ Repository cloned: `movementlabsxyz/aptos-core`  
📍 Location: `/mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/aptos-core`

## Build Instructions

### 1. Install Dependencies (in WSL)
```bash
cd ~/
cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/aptos-core

# Run the setup script
./scripts/dev_setup.sh
```

**Note**: This will install Rust, Cargo, and other dependencies. It may take 10-15 minutes.

### 2. Build the Aptos CLI
```bash
# Build the CLI (this may take 20-30 minutes)
cargo build --release -p aptos

# The binary will be at: target/release/aptos
```

### 3. Verify Installation
```bash
./target/release/aptos --version
```

### 4. Deploy TipJar Contract

#### A. Navigate to Move project
```bash
cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/move
```

#### B. Initialize Aptos (if not done)
```bash
../aptos-core/target/release/aptos init \
  --network custom \
  --rest-url https://testnet.movementnetwork.xyz/v1 \
  --faucet-url https://faucet.testnet.movementnetwork.xyz/
```

Use your existing account address: `0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4`

#### C. Publish the Module
```bash
../aptos-core/target/release/aptos move publish \
  --named-addresses tipjar_addr=0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4 \
  --url https://testnet.movementnetwork.xyz/v1 \
  --assume-yes
```

## Alternative: Quick Test with Pre-built Binary

If building takes too long, you can try downloading a pre-built Aptos CLI v3.5:

```bash
# Download Aptos CLI 3.5 (example for Linux)
wget https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v3.5.0/aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
unzip aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
chmod +x aptos
```

Then use `./aptos` instead of the built binary.

## Troubleshooting

### If dev_setup.sh fails
Try installing dependencies manually:
```bash
sudo apt update
sudo apt install -y build-essential curl git pkg-config libssl-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### If cargo build fails
Check Rust version:
```bash
rustc --version  # Should be 1.70+
cargo --version
```
