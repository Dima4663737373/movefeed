/**
 * Faucet Notice Component
 * 
 * Displayed when user balance is below threshold
 * Provides link to Movement testnet faucet
 */

"use client";

import { MOVEMENT_FAUCET_URL } from "@/lib/movement";

interface FaucetNoticeProps {
    address: string;
}

export default function FaucetNotice({ address }: FaucetNoticeProps) {
    const handleGetTokens = () => {
        // Open faucet in new tab
        window.open(MOVEMENT_FAUCET_URL, "_blank");
    };

    return (
        <div className="card border-yellow-400/30 bg-yellow-400/5">
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-yellow-400">
                        Test Tokens Needed
                    </h3>
                    <p className="text-neutral-300 text-sm mb-4 leading-relaxed">
                        You need Movement testnet tokens to send tips and interact with the blockchain.
                        Get free test tokens from the Movement faucet.
                    </p>

                    {/* Address info */}
                    <div className="bg-black/30 rounded-lg p-3 mb-4">
                        <label className="text-xs text-neutral-400 block mb-1">Your wallet address:</label>
                        <p className="text-xs font-mono text-white break-all">{address}</p>
                    </div>

                    {/* Action button */}
                    <button
                        onClick={handleGetTokens}
                        className="btn-primary"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Get Test Tokens
                    </button>

                    <p className="text-xs text-neutral-500 mt-3">
                        After claiming tokens, refresh your balance above to see the update.
                    </p>
                </div>
            </div>
        </div>
    );
}
