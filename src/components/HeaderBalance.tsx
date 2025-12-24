/**
 * Header Balance Component
 * 
 * Compact balance display for the navigation header
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { getMovementBalance } from "@/lib/movementClient";

interface HeaderBalanceProps {
    address: string;
}

export default function HeaderBalance({ address }: HeaderBalanceProps) {
    const [balance, setBalance] = useState<number | null>(null);
    const [displayBalance, setDisplayBalance] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [isHighlighting, setIsHighlighting] = useState(false);
    
    const prevBalanceRef = useRef<number>(0);
    const isFirstLoad = useRef(true);

    const fetchBalance = async () => {
        if (!address) return;

        // Don't show loading spinner on updates, only initial load
        if (balance === null) setLoading(true);
        
        try {
            const bal = await getMovementBalance(address);
            setBalance(bal);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
            // Don't reset balance on error if we already have one
            if (balance === null) setBalance(0);
        } finally {
            setLoading(false);
        }
    };

    // Balance Animation Effect
    useEffect(() => {
        const currentBalance = balance || 0;

        // Handle initial load
        if (isFirstLoad.current) {
            if (currentBalance > 0) {
                setDisplayBalance(currentBalance);
                prevBalanceRef.current = currentBalance;
                isFirstLoad.current = false;
            } else if (!loading && balance !== null) {
                // If loaded and balance is 0, mark first load as done
                isFirstLoad.current = false;
            }
            return;
        }

        if (currentBalance !== prevBalanceRef.current) {
            // Only animate/highlight if balance increased (received tip/funds)
            if (currentBalance > prevBalanceRef.current) {
                setIsHighlighting(true);
                setTimeout(() => setIsHighlighting(false), 2000); // 2s highlight
            }
            
            // Animate number
            const start = prevBalanceRef.current;
            const end = currentBalance;
            const duration = 1500; // 1.5 second animation
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out expo
                const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                
                const current = start + (end - start) * ease;
                setDisplayBalance(current);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
            prevBalanceRef.current = currentBalance;
        }
    }, [balance, loading]);

    useEffect(() => {
        fetchBalance();
        
        // Refresh every 10 seconds
        const interval = setInterval(fetchBalance, 10000);
        return () => clearInterval(interval);
    }, [address]);

    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 ${
            isHighlighting 
                ? "bg-[var(--accent)]/20 border-[var(--accent)] scale-105 shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                : "bg-neutral-900/50 border-white/5"
        }`}>
            {loading && balance === null ? (
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <>
                    <span className={`text-sm font-medium transition-colors duration-300 ${
                        isHighlighting ? "text-[var(--accent)]" : "text-white"
                    }`}>
                        {displayBalance.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-yellow-400">MOVE</span>
                    <button
                        onClick={fetchBalance}
                        className="ml-1 text-neutral-500 hover:text-white transition-colors"
                        title="Refresh balance"
                    >
                        <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}
