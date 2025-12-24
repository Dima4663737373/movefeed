#!/bin/bash
set -e

# Load private key
RAW_KEY=$(cat new_key_2.txt | tr -d '[:space:]')
if [[ $RAW_KEY == 0x* ]]; then
  # Remove 0x for consistency if needed, but let's just use it
  RAW_KEY=${RAW_KEY:2}
fi
# Add prefix expected by Aptos CLI
# PRIV_KEY="ed25519-priv-0x$RAW_KEY"
PRIV_KEY="0x$RAW_KEY"

# Get absolute path to CLI
CLI="$(pwd)/movement-cli/movement"
REST_URL="https://testnet.movementnetwork.xyz/v1"
FAUCET_URL="https://faucet.testnet.movementnetwork.xyz/"

WORK_DIR="temp_publish"
echo "Setting up clean workspace in $WORK_DIR..."
rm -rf $WORK_DIR
mkdir -p $WORK_DIR
cp -r move $WORK_DIR/

# Remove existing .movement config from the copy to ensure clean init
rm -rf $WORK_DIR/move/.movement

# Clean global config to avoid interference
rm -rf ~/.movement

cd $WORK_DIR/move

echo "Initializing Movement CLI in package directory..."
# Init default profile to avoid "profiles.default" error
$CLI init --profile default \
  --network custom \
  --rest-url $REST_URL \
  --faucet-url $FAUCET_URL \
  --private-key $PRIV_KEY \
  --assume-yes

# Also init mines profile just in case
$CLI init --profile mines \
  --network custom \
  --rest-url $REST_URL \
  --faucet-url $FAUCET_URL \
  --private-key $PRIV_KEY \
  --assume-yes

echo "Config content:"
cat .movement/config.yaml

echo "Compiling..."
$CLI move compile

echo "Publishing..."
$CLI move publish --profile mines --assume-yes
