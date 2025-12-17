/**
 * Movement Network Configuration
 * 
 * This file contains the configuration for connecting to the Movement Network testnet.
 * Movement is a Move-based blockchain network.
 * 
 * Official docs: https://docs.movementnetwork.xyz/general
 * Network endpoints: https://docs.movementnetwork.xyz/devs/networkEndpoints
 */

// Movement Bardock Testnet RPC endpoint (direct)
// Updated to working endpoint after DNS resolution failure on bardock subdomain
export const MOVEMENT_TESTNET_RPC_DIRECT = "https://testnet.movementnetwork.xyz/v1";

// Movement Mainnet RPC endpoint (direct)
export const MOVEMENT_MAINNET_RPC_DIRECT = "https://mainnet.movementnetwork.xyz/v1";

// Movement Bardock Testnet RPC endpoint
// Updated to use Bardock testnet as per documentation
// Using proxy API route to avoid CORS issues in browser
export const MOVEMENT_TESTNET_RPC = typeof window !== 'undefined'
    ? "/api/movement" // Use proxy in browser to avoid CORS
    : MOVEMENT_TESTNET_RPC_DIRECT;  // Direct in server-side

// Movement Mainnet RPC endpoint
export const MOVEMENT_MAINNET_RPC = typeof window !== 'undefined'
    ? "/api/movement-mainnet" // Use proxy in browser to avoid CORS
    : MOVEMENT_MAINNET_RPC_DIRECT;  // Direct in server-side

// Movement Bardock Testnet Indexer endpoint
export const MOVEMENT_TESTNET_INDEXER_DIRECT = "https://indexer.testnet.movementnetwork.xyz/v1/graphql";
export const MOVEMENT_TESTNET_INDEXER = typeof window !== 'undefined'
    ? "/api/movement-indexer"
    : MOVEMENT_TESTNET_INDEXER_DIRECT;

// Movement Mainnet Indexer endpoint
export const MOVEMENT_MAINNET_INDEXER_DIRECT = "https://indexer.mainnet.movementnetwork.xyz/v1/graphql";
export const MOVEMENT_MAINNET_INDEXER = typeof window !== 'undefined'
    ? "/api/movement-mainnet-indexer"
    : MOVEMENT_MAINNET_INDEXER_DIRECT;

// Movement Bardock Testnet Chain ID
// Note: This is based on Movement documentation
export const MOVEMENT_TESTNET_CHAIN_ID = 250;
export const MOVEMENT_CHAIN_ID = MOVEMENT_TESTNET_CHAIN_ID; // Deprecated alias

// Movement Mainnet Chain ID
export const MOVEMENT_MAINNET_CHAIN_ID = 126;

// Movement Network name for display purposes
export const MOVEMENT_NETWORK_NAME = "Movement Bardock Testnet";
export const MOVEMENT_MAINNET_NAME = "Movement Mainnet";

export type NetworkType = 'testnet' | 'mainnet';

export interface NetworkConfig {
    type: NetworkType;
    chainId: number;
    evmChainId?: number;
    rpcUrl: string;
    indexerUrl?: string;
    networkName: string;
    explorerUrl: string;
    bridgeUrl?: string;
    moduleAddress: string;
}

export const NETWORKS: Record<NetworkType, NetworkConfig> = {
    testnet: {
        type: 'testnet',
        chainId: MOVEMENT_TESTNET_CHAIN_ID,
        evmChainId: 250, // Standard Movement Testnet EVM Chain ID
        rpcUrl: MOVEMENT_TESTNET_RPC,
        indexerUrl: MOVEMENT_TESTNET_INDEXER,
        networkName: MOVEMENT_NETWORK_NAME,
        explorerUrl: "https://explorer.movementnetwork.xyz/?network=testnet",
        bridgeUrl: "https://bridge.testnet.movementnetwork.xyz/", // Assuming standard naming, or leave undefined
        // Testnet Module Address
        moduleAddress: "0x87460d0dfcda5ce7853e9a976069b3be904be4ad7f41df37905fda29610166fb"
    },
    mainnet: {
        type: 'mainnet',
        chainId: MOVEMENT_MAINNET_CHAIN_ID,
        evmChainId: 3073, // Mainnet EVM Chain ID
        rpcUrl: MOVEMENT_MAINNET_RPC,
        indexerUrl: MOVEMENT_MAINNET_INDEXER,
        networkName: MOVEMENT_MAINNET_NAME,
        explorerUrl: "https://explorer.movementnetwork.xyz/?network=mainnet",
        bridgeUrl: "https://bridge.movementnetwork.xyz/",
        // Mainnet Module Address
        moduleAddress: "0x9cef2fdeac69283a0419d51fdf7ffd4430347c6aef63674282c8a3c97dbef204"
    }
};

export function getStoredNetwork(): NetworkType {
    if (typeof window === 'undefined') return 'testnet';
    return (localStorage.getItem('movement_network') as NetworkType) || 'testnet';
}

export function getCurrentNetworkConfig(): NetworkConfig {
    const type = getStoredNetwork();
    const config = NETWORKS[type] || NETWORKS.testnet;

    // Force proxy URL in browser to avoid CORS and ensure dynamic resolution
    if (typeof window !== 'undefined') {
        if (config.type === 'mainnet') {
            return {
                ...config,
                rpcUrl: "/api/movement-mainnet"
            };
        } else if (config.type === 'testnet') {
            return {
                ...config,
                rpcUrl: "/api/movement"
            };
        }
    }

    return config;
}

export function getModuleAddress(): string {
    return getCurrentNetworkConfig().moduleAddress;
}

/**
 * Movement Network configuration object
 * This can be used to configure wallet providers or RPC clients
 */
export const MOVEMENT_NETWORK_CONFIG = {
    chainId: MOVEMENT_CHAIN_ID,
    rpcUrl: MOVEMENT_TESTNET_RPC,
    networkName: MOVEMENT_NETWORK_NAME,
} as const;

/**
 * Helper function to format Movement addresses
 * Movement uses a similar address format to Ethereum (0x...)
 */
export function formatMovementAddress(address: string): string {
    if (!address) return "";

    // Ensure address starts with 0x
    const formattedAddress = address.startsWith("0x") ? address : `0x${address}`;

    // Return shortened format: 0x1234...5678
    if (formattedAddress.length > 10) {
        return `${formattedAddress.slice(0, 6)}...${formattedAddress.slice(-4)}`;
    }

    return formattedAddress;
}

/**
 * Convert EVM address (20 bytes) to Movement address (32 bytes)
 * 
 * Movement allows using EVM addresses on the Move side by padding them 
 * with zeros to match the 32-byte requirement.
 * 
 * @param address - The EVM address (0x + 40 chars)
 * @returns The Movement address (0x + 64 chars)
 */
export function convertToMovementAddress(address: string): string {
    if (!address) return "";

    // Remove 0x prefix
    const cleanAddress = address.startsWith("0x") ? address.slice(2) : address;

    // If it's already 32 bytes (64 chars), return it
    if (cleanAddress.length === 64) {
        return `0x${cleanAddress}`;
    }

    // Pad with zeros to 64 chars (32 bytes)
    // We pad start because the error suggested padding, and usually for type conversion 
    // we pad left. However, for address mapping it might be specific.
    // The error said: "padding it with 0s before passing it to fromString".
    // AccountAddress.fromString expects 0x + 64 hex chars.
    return `0x${cleanAddress.padStart(64, "0")}`;
}

/**
 * Helper function to validate Movement address format
 */
export function isValidMovementAddress(address: string): boolean {
    if (!address) return false;

    // Basic validation: starts with 0x and has correct length
    const hexRegex = /^0x[a-fA-F0-9]{40}$/;
    return hexRegex.test(address);
}

// ============================================================================
// Wave 2 - On-chain Tipping Configuration
// ============================================================================

/**
 * TipJar Move Module Address
 * 
 * TODO: After deploying the TipJar module to Movement testnet,
 * update this with the actual deployed module address.
 * 
 * Deployment instructions: see DEPLOYMENT.md
 * 
 * Example format: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
 */
export const TIPJAR_MODULE_ADDRESS = getCurrentNetworkConfig().moduleAddress;

/**
 * Movement Bardock Testnet Faucet URL
 * Users need test tokens to interact with the blockchain
 */
export const MOVEMENT_FAUCET_URL = "https://faucet.movementnetwork.xyz/";

/**
 * Minimum balance threshold (in tokens)
 * If user balance is below this, show faucet notice
 */
export const MIN_BALANCE_THRESHOLD = 0.1; // 0.1 MOVE tokens

/**
 * Test tip amount (in octas)
 * Movement Network: 1 MOVE = 100,000,000 octas (8 decimals)
 * 0.1 MOVE = 10,000,000 octas
 */
export const TEST_TIP_AMOUNT_OCTAS = 10000000;

/**
 * Convert octas to MOVE tokens
 * Movement uses 8 decimals (100,000,000 octas = 1 MOVE)
 */
export function octasToMove(octas: number): number {
    return octas / 100_000_000;
}

/**
 * Convert MOVE tokens to octas
 */
export function moveToOctas(move: number): number {
    return Math.floor(move * 100_000_000);
}

/**
 * Default gas configuration for Movement Network
 * These are fallback values if gas estimation fails
 */
export const DEFAULT_GAS_CONFIG = {
    maxGasAmount: 200000, // Maximum gas units (increased for safety)
    gasUnitPrice: 100,     // Gas unit price in octas
};

/**
 * Gas estimation result interface
 */
export interface GasEstimation {
    gasEstimate: number;
    gasUnitPrice: number;
    maxGasAmount: number;
}

/**
 * Format a number to a compact string (e.g. 1.2k, 1.5M)
 */
export function formatCompactNumber(num: number): string {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
}
