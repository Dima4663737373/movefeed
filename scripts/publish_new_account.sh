#!/bin/bash
set -e

# Generate a new private key
# 32 bytes = 64 hex chars
NEW_KEY="0x$(openssl rand -hex 32)"
echo "Generated New Private Key: $NEW_KEY"

# CLI Path
CLI="$(pwd)/movement-cli/movement"
# Use the URLs that worked previously
REST_URL="https://testnet.movementnetwork.xyz/v1"
FAUCET_URL="https://faucet.testnet.movementnetwork.xyz/"

WORK_DIR="temp_publish_v4"
echo "Setting up clean workspace in $WORK_DIR..."
rm -rf $WORK_DIR
mkdir -p $WORK_DIR
cp -r move $WORK_DIR/

# Clean global config to avoid interference
rm -rf ~/.movement

cd $WORK_DIR/move

echo "Initializing New Account..."
$CLI init --profile default \
  --network custom \
  --rest-url $REST_URL \
  --faucet-url $FAUCET_URL \
  --private-key $NEW_KEY \
  --assume-yes

# Extract Address
ADDRESS=$(grep "account:" .movement/config.yaml | awk '{print $2}' | tr -d '"')
echo "Generated Address: $ADDRESS"

# Fund the account
echo "Funding account..."
# Try to fund multiple times just in case
$CLI account fund-with-faucet --account $ADDRESS --faucet-url $FAUCET_URL --assume-yes || echo "Funding attempt 1 failed"
sleep 2
$CLI account fund-with-faucet --account $ADDRESS --faucet-url $FAUCET_URL --assume-yes || echo "Funding attempt 2 failed"

# Update Move.toml
# Replace 'mines = "..."' with 'mines = "$ADDRESS"'
sed -i "s/mines = \".*\"/mines = \"$ADDRESS\"/" Move.toml

echo "Compiling..."
$CLI move compile

echo "Publishing..."
# Capture output to find errors
OUTPUT=$($CLI move publish --profile default --assume-yes 2>&1)
echo "$OUTPUT"

if echo "$OUTPUT" | grep -q "UPGRADED"; then
    echo "SUCCESS! New Contract Address: $ADDRESS"
    # Save the address and key for future use
    echo "Address: $ADDRESS" > ../../new_account_details.txt
    echo "PrivateKey: $NEW_KEY" >> ../../new_account_details.txt
elif echo "$OUTPUT" | grep -q "Success"; then
    echo "SUCCESS! New Contract Address: $ADDRESS"
    echo "Address: $ADDRESS" > ../../new_account_details.txt
    echo "PrivateKey: $NEW_KEY" >> ../../new_account_details.txt
else
    echo "Publishing might have failed. Check output above."
fi
