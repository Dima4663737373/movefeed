/**
 * WalletAddressCard Component
 * 
 * Displays the user's Movement wallet address with copy functionality
 * for easy access to faucet.
 */

"use client";

import { useState } from "react";

interface WalletAddressCardProps {
    address: string;
}

export default function WalletAddressCard({ address }: WalletAddressCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const formatAddress = (addr: string) => {
        if (!addr) return "";
        return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
    };

    return (
        <div className="card">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <h3 className="text-sm font-medium text-neutral-400">Your Movement Address</h3>
                    </div>
                    <div className="font-mono text-sm text-white break-all">
                        <span className="hidden md:inline">{address}</span>
                        <span className="md:hidden">{formatAddress(address)}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">
                        Use this address to get test tokens from the faucet
                    </p>
                </div>
                <button
                    onClick={handleCopy}
                    className="btn-ghost px-3 py-2 text-xs shrink-0"
                >
                    {copied ? (
                        <span className="flex items-center gap-1.5 text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                        </span>
                    )}
                </button>
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-800 flex justify-end">
                <a
                    href="https://faucet.movementlabs.xyz/?network=testnet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
                >
                    Get Test Tokens
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>
        </div>
    );
}
