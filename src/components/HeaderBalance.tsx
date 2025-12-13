/**
 * Header Balance Component
 * 
 * Compact balance display for the navigation header
 */

"use client";

import { useState, useEffect } from "react";
import { getMovementBalance } from "@/lib/movementClient";

interface HeaderBalanceProps {
    address: string;
}

export default function HeaderBalance({ address }: HeaderBalanceProps) {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBalance = async () => {
        if (!address) return;

        setLoading(true);
        try {
            const bal = await getMovementBalance(address);
            setBalance(bal);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
            setBalance(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [address]);

    return (
        <div className="flex items-center gap-2 bg-neutral-900/50 px-3 py-1.5 rounded-lg border border-white/5">
            {loading ? (
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <>
                    <span className="text-sm font-medium text-white">
                        {balance?.toFixed(2) ?? "0.00"}
                    </span>
                    <span className="text-xs font-bold text-yellow-400">MOVE</span>
                    <button
                        onClick={fetchBalance}
                        className="ml-1 text-neutral-500 hover:text-white transition-colors"
                        title="Refresh balance"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}
