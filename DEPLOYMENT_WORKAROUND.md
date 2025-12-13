# Movement Network Deployment - Workaround Options

## Problem
- Aptos CLI 7.11.1 is incompatible with Movement Network (requires ≤3.5)
- Building from source requires `sudo` which is disabled in your WSL

## Solution Options

### Option 1: Enable Sudo in WSL (Recommended)
1. Open **Windows Settings**
2. Go to **Privacy & Security** → **For Developers**
3. Enable **Developer Mode**
4. Restart WSL terminal
5. Then run:
   ```bash
   sudo apt install -y libudev-dev pkg-config libssl-dev build-essential
   cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/aptos-core
   cargo build --release -p aptos
   ```

### Option 2: Download Pre-built Aptos CLI 3.5
```bash
cd ~
wget https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v3.5.0/aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
unzip aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
chmod +x aptos
./aptos --version  # Should show 3.5.0

# Then deploy:
cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/move
~/aptos move publish \
  --named-addresses tipjar_addr=0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4 \
  --url https://testnet.movementnetwork.xyz/v1 \
  --assume-yes
```

### Option 3: Simplified Contract (No Build Required)
Use the current Windows Aptos CLI with a minimal contract that avoids the deserialization error:

**Simplified TipJar.move** (already created):
```move
module tipjar_addr::TipJar {
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    public entry fun send_tip(
        account: &signer,
        recipient: address,
        amount: u64
    ) {
        coin::transfer<AptosCoin>(account, recipient, amount);
    }
}
```

Then implement history tracking on the frontend by reading blockchain events.

## Recommended Path
**Option 2** (Pre-built binary) is the fastest and most reliable.

Just run these commands in WSL:
```bash
cd ~
wget https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v3.5.0/aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
unzip aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip
chmod +x aptos
cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/move
~/aptos move publish \
  --named-addresses tipjar_addr=0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4 \
  --url https://testnet.movementnetwork.xyz/v1 \
  --assume-yes
```
