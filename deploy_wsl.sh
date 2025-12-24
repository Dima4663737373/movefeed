#!/bin/bash
set -e

# Path to movement binary
MOVEMENT_CLI="../bin/movement"
PRIVATE_KEY="0xf17a351a44abc767e81908339b89bdaef46f21e8cfa91cb70963d73c7156e841"
RPC_URL="https://testnet.movementnetwork.xyz/v1"
FAUCET_URL="https://faucet.testnet.movementnetwork.xyz/"

cd move

echo "Cleaning up..."
rm -rf build
rm -rf .aptos
rm -rf .movement

echo "Initializing Movement CLI..."
# Init with private key
$MOVEMENT_CLI init \
  --network custom \
  --rest-url $RPC_URL \
  --faucet-url $FAUCET_URL \
  --private-key $PRIVATE_KEY \
  --assume-yes

# Get the address from the config
ADDRESS=$(grep "account:" .movement/config.yaml | awk '{print $2}' | tr -d '"')
echo "Deploying from address: $ADDRESS"

echo "Publishing contracts..."
$MOVEMENT_CLI move publish \
  --named-addresses mines=$ADDRESS \
  --url $RPC_URL \
  --assume-yes
