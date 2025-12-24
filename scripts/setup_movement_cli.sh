#!/bin/bash
set -e

DOWNLOAD_URL="https://github.com/movementlabsxyz/aptos-core/releases/download/movement-full-node-v0.0.1-alpha/movement-cli--Ubuntu-22.04-x86_64.zip"
CLI_DIR="movement-cli"
ZIP_FILE="movement-cli.zip"

echo "Creating directory $CLI_DIR..."
mkdir -p $CLI_DIR

echo "Downloading Movement CLI..."
wget -O $CLI_DIR/$ZIP_FILE $DOWNLOAD_URL

echo "Unzipping..."
cd $CLI_DIR
unzip -o $ZIP_FILE

echo "Making executable..."
chmod +x movement

echo "Verifying installation..."
./movement --version

echo "Setup complete."
