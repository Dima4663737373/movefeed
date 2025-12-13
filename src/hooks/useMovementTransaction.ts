/**
 * useMovementTransaction Hook
 * 
 * Custom hook for signing and submitting transactions to Movement Network.
 * Uses @aptos-labs/wallet-adapter-react for external wallets (Razor, Petra).
 */

import { useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getAptosClient, getGasEstimation } from "@/lib/movementClient";
import { TIPJAR_MODULE_ADDRESS } from "@/lib/movement";

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
        amount: number
    ): Promise<TransactionResult> => {
        setLoading(true);
        setError(null);

        try {
            if (!adapterConnected || !adapterAccount) {
                throw new Error("Please connect your wallet first.");
            }

            console.log("🔌 Using Wallet:", adapterAccount.address);

            // 1. Get gas estimation
            console.log("⛽ Fetching gas estimation...");
            const gasEstimation = await getGasEstimation();
            console.log("⛽ Gas estimation:", gasEstimation);

            const response = await adapterSignAndSubmit({
                data: {
                    function: `${TIPJAR_MODULE_ADDRESS}::TipJar::send_tip`,
                    typeArguments: [],
                    functionArguments: [recipient, amount.toString()] // Pass amount as string
                },
                options: {
                    maxGasAmount: gasEstimation.maxGasAmount,
                    gasUnitPrice: gasEstimation.gasUnitPrice,
                }
            });

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
