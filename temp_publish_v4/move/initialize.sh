#!/bin/bash

# Initialize MicroThreads Contract
# Run this once after deployment

echo "Initializing MicroThreads contract..."

~/aptos-3.5.0 move run \
  --function-id 0x7e218b2d60d7415e97d11aa67841f2b93948b78060eedb102fb0bf118efad0e4::MicroThreads::initialize \
  --assume-yes

echo "Contract initialized successfully!"
