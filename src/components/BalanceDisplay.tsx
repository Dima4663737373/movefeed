/**
 * Balance Display Component
 * 
 * Shows the user's Movement testnet balance with refresh capability
 */

"use client";

import { useState, useEffect } from "react";
import { getMovementBalance } from "@/lib/movementClient";
import { octasToMove } from "@/lib/movement";

interface BalanceDisplayProps {
    address: string;
    onBalanceChange?: (balance: number) => void;
}

export default function BalanceDisplay({ address, onBalanceChange }: BalanceDisplayProps) {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        if (!address) return;

        setLoading(true);
        setError(null);

        try {
            const bal = await getMovementBalance(address);
            setBalance(bal);
            onBalanceChange?.(bal);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
            setError("Failed to load balance");
            setBalance(0);
            onBalanceChange?.(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [address]);

    const handleRefresh = () => {
        fetchBalance();
    };

    if (loading) {
        return (
            <div className="info-box">
                <label className="info-label">Movement Balance</label>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-neutral-400 text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="info-box">
                <label className="info-label">Movement Balance</label>
                <div className="flex items-center justify-between">
                    <span className="text-red-400 text-sm">{error}</span>
                    <button
                        onClick={handleRefresh}
                        className="text-yellow-400 hover:text-yellow-300 text-sm transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="info-box">
            <label className="info-label">Movement Balance</label>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">
                        {balance?.toFixed(4) ?? "0.0000"}
                    </span>
                    <span className="text-neutral-400">MOVE</span>
                </div>
                <button
                    onClick={handleRefresh}
                    className="btn-ghost text-sm py-2 px-3"
                    title="Refresh balance"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
