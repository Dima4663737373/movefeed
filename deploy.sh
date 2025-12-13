#!/bin/bash
# Quick Deployment Script for Movement Network
# Run this in WSL terminal

echo "=== Downloading Aptos CLI 3.5 ==="
cd ~
wget https://github.com/aptos-labs/aptos-core/releases/download/aptos-cli-v3.5.0/aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip

echo "=== Extracting ==="
unzip -o aptos-cli-3.5.0-Ubuntu-22.04-x86_64.zip

echo "=== Making executable ==="
chmod +x aptos

echo "=== Verifying installation ==="
./aptos --version

echo "=== Deploying TipJar contract ==="
cd /mnt/c/Users/Leonid/.gemini/antigravity/scratch/microthreads-tips/move

~/aptos move publish \
  --named-addresses tipjar_addr=0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4 \
  --url https://testnet.movementnetwork.xyz/v1 \
  --assume-yes

echo "=== Done! ==="
