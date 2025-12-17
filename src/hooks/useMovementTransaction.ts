/**
 * useMovementTransaction Hook
 * 
 * Custom hook for signing and submitting transactions to Movement Network.
 * Uses @aptos-labs/wallet-adapter-react for external wallets (Razor, Petra).
 */

import { useState } from "react";
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { getAptosClient, getGasEstimation } from "@/lib/movementClient";
import { getModuleAddress } from "@/lib/movement";

interface TransactionResult {
    hash: string;
    success: boolean;
}

export function useMovementTransaction() {
    const {
        account: adapterAccount,
        connected: adapterConnected,
        signAndSubmitTransaction: adapterSignAndSubmit
    } = useWallet();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Send a tip transaction
     */
    const sendTip = async (
        recipient: string,
        amount: number,
        postId: string
    ): Promise<TransactionResult> => {
        setLoading(true);
        setError(null);

        try {
            const moduleAddress = getModuleAddress();
            // Check if module address is configured (Mainnet safety)
            if (!moduleAddress || moduleAddress.length < 10) {
                throw new Error("Tipping is not enabled on this network.");
            }

            if (!adapterConnected || !adapterAccount) {
                throw new Error("Please connect your wallet first.");
            }

            console.log("🔌 Using Wallet:", adapterAccount.address);

            // 1. Get gas estimation
            console.log("⛽ Fetching gas estimation...");
            const gasEstimation = await getGasEstimation();
            console.log("⛽ Gas estimation:", gasEstimation);

            // Use standard coin transfer for direct tips
            // 0x1::coin::transfer<0x1::aptos_coin::AptosCoin>(recipient, amount)
            const amountInOctas = Math.floor(amount * 100_000_000);
            
            // Use the smart contract for tipping to ensure stats are updated
            // public entry fun tip_post(account: &signer, creator: address, post_id: u64, amount: u64)
            const payload: InputTransactionData = {
                data: {
                    function: `${moduleAddress}::MoveFeedV3::tip_post`,
                    typeArguments: [],
                    functionArguments: [recipient, postId, amountInOctas.toString()]
                }
            };

            console.log("💸 Sending Tip via Contract:", payload);

            const response = await adapterSignAndSubmit(payload);

            console.log("✅ Transaction submitted:", response.hash);

            const client = getAptosClient();
            const executedTransaction = await client.waitForTransaction({
                transactionHash: response.hash
            });

            return {
                hash: response.hash,
                success: executedTransaction.success
            };

        } catch (err) {
            console.error("❌ Transaction error:", err);
            const errorMessage = err instanceof Error ? err.message : "Transaction failed";
            setError(errorMessage);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        sendTip,
        loading,
        error
    };
}
