/**
 * Movement Network Client
 * 
 * Utilities for interacting with Movement Network RPC using Aptos SDK
 */

import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";
import { MOVEMENT_TESTNET_RPC, MOVEMENT_TESTNET_INDEXER, convertToMovementAddress, octasToMove, TIPJAR_MODULE_ADDRESS, DEFAULT_GAS_CONFIG, GasEstimation, getCurrentNetworkConfig, NetworkConfig } from "./movement";

/**
 * Get configured Aptos client for Movement Network
 * 
 * We use Aptos SDK with custom network configuration pointing to Movement RPC
 */
export function getAptosClient(configOverride?: NetworkConfig): Aptos {
  const currentConfig = configOverride || getCurrentNetworkConfig();
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: currentConfig.rpcUrl,
    indexer: currentConfig.indexerUrl,
    chainId: currentConfig.chainId,
  });

  return new Aptos(config);
}

/**
 * Get Movement testnet balance for an address
 * 
 * @param address - The account address (0x... format)
 * @returns Balance in MOVE tokens (human-readable, not octas)
 * 
 * Note: 1 MOVE = 100,000,000 octas (8 decimals)
 */
export async function getMovementBalance(address: string): Promise<number> {
  try {
    const client = getAptosClient();

    // Convert EVM address to Movement address (pad to 32 bytes)
    const movementAddress = convertToMovementAddress(address);

    // Normalize address format for SDK
    const accountAddress = AccountAddress.from(movementAddress);

    // Get account resource with AptosCoin balance
    // On Movement, the native token uses the same AptosCoin type as Aptos
    const resource = await client.getAccountCoinAmount({
      accountAddress: accountAddress,
      coinType: "0x1::aptos_coin::AptosCoin",
    });

    // Convert from octas to MOVE tokens
    // resource is in octas (smallest unit)
    const balanceInMove = octasToMove(resource);

    return balanceInMove;
  } catch (error) {
    console.error("Error fetching Movement balance:", error);

    // If account doesn't exist or has no balance, return 0
    if (error instanceof Error && error.message.includes("not found")) {
      return 0;
    }

    throw error;
  }
}

// Alias for convenience
export const getBalance = getMovementBalance;

/**
 * Check if an account exists on Movement Network
 * 
 * @param address - The account address
 * @returns true if account exists, false otherwise
 */
export async function accountExists(address: string): Promise<boolean> {
  try {
    const client = getAptosClient();
    // Convert EVM address if needed
    const movementAddress = convertToMovementAddress(address);
    const accountAddress = AccountAddress.from(movementAddress);

    await client.getAccountInfo({
      accountAddress: accountAddress,
    });

    return true;
  } catch (error) {
    // Account doesn't exist
    return false;
  }
}

/**
 * Get account information from Movement Network
 * 
 * @param address - The account address
 * @returns Account info including sequence number
 */
export async function getAccountInfo(address: string) {
  try {
    const client = getAptosClient();
    // Convert EVM address if needed
    const movementAddress = convertToMovementAddress(address);
    const accountAddress = AccountAddress.from(movementAddress);

    const accountInfo = await client.getAccountInfo({
      accountAddress: accountAddress,
    });

    return accountInfo;
  } catch (error) {
    console.error("Error fetching account info:", error);
    throw error;
  }
}

/**
 * Save transaction to server history
 */
export async function saveLocalTransaction(tip: any) {
  if (typeof window === 'undefined') return;

  try {
    // Save to server
    await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tip)
    });

    // Trigger storage event for legacy listeners if any
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error("Failed to save transaction", e);
  }
}

/**
 * Fetch tip history from posts
 * 
 * Since Movement/Aptos doesn't have easy transaction history API,
 * we extract tip information from posts that have received tips
 */
/**
 * Fetch tip history for a specific address
 * 
 * - Received tips: Fetched from on-chain posts (public)
 * - Sent tips: Fetched from local storage (private, only visible to owner)
 */
/**
 * Fetch tip history for a specific address
 * 
 * - Received tips: Fetched from TipEvent events on-chain (includes real tx hash)
 * - Sent tips: Fetched from local storage (private, only visible to owner)
 */
export async function getTipHistory(targetAddress?: string) {
  try {
    // Import here to avoid circular dependency
    const { getUserPostsPaginated, getUserPostsCount } = await import('./microThreadsClient');
    const { octasToMove, TIPJAR_MODULE_ADDRESS } = await import('./movement');
    const { getAptosClient } = await import('./movementClient'); // Import from self/module

    // Determine address to fetch for
    let addressToCheck = targetAddress;
    let currentUserAddress = '';

    if (typeof window !== 'undefined') {
      currentUserAddress = localStorage.getItem('movement_last_connected_address') || '';
      if (!addressToCheck) {
        addressToCheck = currentUserAddress;
      }
    }

    if (!addressToCheck) {
      return [];
    }

    // Normalize address to Movement format (32 bytes) for consistent matching
    const normalizedAddress = convertToMovementAddress(addressToCheck);
    // Also keep the short version (no 0x, no padding) if needed for some comparisons, 
    // but usually on-chain data is full 32 bytes (64 hex chars).
    
    // 1. Fetch Tips from Events (Received AND Sent)
    let onChainTips: any[] = [];
    try {
      // const client = getAptosClient();
      // const eventType = `${TIPJAR_MODULE_ADDRESS}::MoveFeed::TipEvent`;

      // Fetch events from the module
      // TODO: Update to use new Aptos SDK Indexer API as getModuleEventsByEventType is deprecated
      const events: any[] = []; 
      /* await client.getModuleEventsByEventType({
        eventType: eventType as `${string}::${string}::${string}`,
      }); */

      onChainTips = events
        .filter((e: any) => {
          // Filter where we are either the creator (receiver) or tipper (sender)
          // Normalize event addresses to ensure consistent comparison
          const eventCreator = convertToMovementAddress(e.data.creator);
          const eventTipper = convertToMovementAddress(e.data.tipper);

          const isReceiver = eventCreator === normalizedAddress;
          const isSender = eventTipper === normalizedAddress;

          return isReceiver || isSender;
        })
        .map((e: any) => {
          const eventCreator = convertToMovementAddress(e.data.creator);
          const isReceiver = eventCreator === normalizedAddress;

          return {
            sender: e.data.tipper,
            receiver: e.data.creator,
            amount: octasToMove(parseInt(e.data.amount)),
            timestamp: parseInt(e.data.timestamp),
            hash: e.transaction_version, // Use version as hash/ID for explorer
            postId: e.data.post_id,
            type: isReceiver ? 'received' : 'sent'
          };
        });

    } catch (eventError) {
      console.error("Error fetching tip events:", eventError);
      // Fallback to post-based derivation if event fetching fails (only for received)
      // Check last 100 posts for tips as a scalable fallback
      let posts: any[] = [];
      try {
        const count = await getUserPostsCount(normalizedAddress);
        const LIMIT = 100;
        const start = Math.max(0, count - LIMIT);
        posts = await getUserPostsPaginated(normalizedAddress, start, LIMIT);
      } catch (err) {
        console.error("Error fetching fallback posts for tips:", err);
      }

      const fallbackReceived = posts
        .filter(post => post.total_tips > 0)
        .map(post => ({
          sender: 'Tips on Post',
          receiver: normalizedAddress,
          amount: octasToMove(post.total_tips),
          timestamp: post.last_tip_timestamp || post.timestamp,
          hash: `post-${post.id}`, // Fallback hash
          postId: post.id.toString(),
          type: 'received'
        }));
      onChainTips = fallbackReceived;
    }

    // Filter out received tips based on snapshot (for "Clear Activity" feature)
    let filteredTips = onChainTips;
    if (typeof window !== 'undefined') {
      try {
        const clearedAt = parseInt(localStorage.getItem('received_tips_cleared_at') || '0');
        if (clearedAt > 0) {
          filteredTips = onChainTips.filter(tip => tip.timestamp > clearedAt);
        }
      } catch (e) {
        console.error("Error filtering tips", e);
      }
    }

    // 2. Fetch Sent Tips (Server API)
    let localSentTips: any[] = [];
    if (addressToCheck) {
      try {
        const res = await fetch(`/api/tips?userAddress=${addressToCheck}`);
        if (res.ok) {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const serverTips = await res.json();
                localSentTips = serverTips.map((tip: any) => ({
                ...tip,
                // Normalize timestamp to seconds if it's in milliseconds
                timestamp: tip.timestamp > 100000000000 ? Math.floor(tip.timestamp / 1000) : tip.timestamp
                }));
            } else {
                const text = await res.text();
                console.warn(`API /api/tips returned non-JSON response: ${text.substring(0, 100)}...`);
            }
        } else {
            // Log the error details from the server
            const errBody = await res.text();
            console.error(`Error reading tips from API (${res.status}):`, errBody);
        }
      } catch (e) {
        console.error("Error reading tips from API", e);
      }
    }

    // Merge and Sort
    // Combine on-chain tips with local tips
    const allTips = [...filteredTips, ...localSentTips];

    // Deduplicate by hash/version
    // Local tips might not have a version/hash immediately, or might conflict
    // We prioritize on-chain tips if hashes match
    const uniqueTipsMap = new Map();

    allTips.forEach(tip => {
      // If tip has a hash, use it as key. If not (some local tips?), use timestamp+amount
      const key = tip.hash || `${tip.timestamp}-${tip.amount}`;

      if (!uniqueTipsMap.has(key)) {
        uniqueTipsMap.set(key, tip);
      } else {
        // If we already have it, prefer the one with a real hash (likely on-chain)
        const existing = uniqueTipsMap.get(key);
        if (!existing.hash || existing.hash.startsWith('post-')) {
          if (tip.hash && !tip.hash.startsWith('post-')) {
            uniqueTipsMap.set(key, tip);
          }
        }
      }
    });

    return Array.from(uniqueTipsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error fetching tip history:', error);
    return [];
  }
}

/**
 * Get gas price estimation from Movement Network
 * 
 * @returns Gas estimation with gasEstimate, gasUnitPrice, and maxGasAmount
 */
export async function getGasEstimation(): Promise<GasEstimation> {
  try {
    const client = getAptosClient();

    // Get gas price estimation from the network
    const gasEstimation = await client.getGasPriceEstimation();

    console.log("📊 Gas estimation from network:", gasEstimation);

    // gas_estimate is the gas unit price (in octas per gas unit)
    const gasUnitPrice = gasEstimation.gas_estimate || DEFAULT_GAS_CONFIG.gasUnitPrice;

    // For maxGasAmount, we use a standard value with headroom
    // Typical simple transactions use ~1000-5000 gas units
    // We set maxGasAmount to 100000 to have plenty of headroom
    const maxGasAmount = DEFAULT_GAS_CONFIG.maxGasAmount;

    return {
      gasEstimate: gasUnitPrice, // For compatibility
      gasUnitPrice,
      maxGasAmount,
    };
  } catch (error) {
    console.warn("⚠️ Failed to get gas estimation, using defaults:", error);

    // Return default values if estimation fails
    return {
      gasEstimate: DEFAULT_GAS_CONFIG.gasUnitPrice,
      gasUnitPrice: DEFAULT_GAS_CONFIG.gasUnitPrice,
      maxGasAmount: DEFAULT_GAS_CONFIG.maxGasAmount,
    };
  }
}

/**
 * Fetch global stats from the contract
 */
export async function getStats() {
  try {
    const currentConfig = getCurrentNetworkConfig();
    const moduleAddress = currentConfig.moduleAddress;

    // Check if module address is configured (Mainnet safety)
    if (!moduleAddress || moduleAddress.length < 10) {
        return {
            totalTips: 0,
            totalVolume: 0,
            topTipper: "None"
        };
    }

    const config = new AptosConfig({ 
        network: Network.CUSTOM,
        fullnode: currentConfig.rpcUrl 
    });
    const aptos = new Aptos(config);
    const MODULE_NAME = "MoveFeedV3";

    // Note: We can't easily get totalTips (count of tipped posts) without indexing or fetching all posts (unscalable)
    // So we set it to 0 for now.
    const totalTips = 0;

    // Get global stats from contract
    let totalVolume = 0;
    let topTipper = "None";

    try {
      const payload = {
        function: `${moduleAddress}::${MODULE_NAME}::get_global_tip_stats` as `${string}::${string}::${string}`,
        functionArguments: [],
      };

      const result = await aptos.view({ payload });
      console.log('📊 Contract stats result:', result);

      // Result is [total_volume, top_tipper, top_tipper_amount]
      const totalVolumeOctas = parseInt(result[0] as string);
      const topTipperAddress = result[1] as string;

      console.log('📊 Contract volume (octas):', totalVolumeOctas);
      console.log('📊 Contract volume (MOVE):', octasToMove(totalVolumeOctas));

      totalVolume = octasToMove(totalVolumeOctas);

      if (topTipperAddress !== "0x0" && topTipperAddress !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        topTipper = topTipperAddress;
      }
      
      return {
        totalTips,
        totalVolume,
        topTipper
      };
    } catch (e) {
      console.error("Error fetching stats from contract:", e);
      return {
        totalTips: 0,
        totalVolume: 0,
        topTipper: "None"
      };
    }
  } catch (error) {
    console.error("Error in getStats:", error);
    return {
      totalTips: 0,
      totalVolume: 0,
      topTipper: "None"
    };
  }
}
