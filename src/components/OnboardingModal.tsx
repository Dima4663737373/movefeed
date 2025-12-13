/**
 * OnboardingModal Component
 * 
 * A 3-step wizard to guide new users:
 * 1. Connect Wallet (Done automatically)
 * 2. Get Tokens (Faucet)
 * 3. Send First Tip
 */

import { useState } from "react";
import { MOVEMENT_FAUCET_URL } from "@/lib/movement";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    hasTipped: boolean;
    address: string;
}

export default function OnboardingModal({ isOpen, onClose, balance, hasTipped, address }: OnboardingModalProps) {
    const [step, setStep] = useState(1);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    // Determine current step based on user state
    const currentStep = balance < 0.1 ? 2 : 3;

    const handleGetTokens = () => {
        window.open(MOVEMENT_FAUCET_URL, "_blank");
    };

    const handleCopyAddress = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        {/* <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Welcome to Wave 3</span> */}
                    </div>
                    <h2 className="text-2xl font-bold text-white">Let's get started</h2>
                    <p className="text-neutral-400 mt-2">Complete these steps to become a MoveFeed creator.</p>
                </div>

                {/* Steps */}
                <div className="space-y-4 mb-8">
                    {/* Step 1: Connect Wallet */}
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium text-green-400">Connect Wallet</h3>
                            <p className="text-xs text-green-400/70">Connected successfully</p>
                        </div>
                    </div>

                    {/* Step 2: Get Tokens */}
                    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${currentStep === 2
                        ? "bg-blue-500/10 border-blue-500/20"
                        : balance >= 0.1
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-neutral-800/50 border-neutral-800"
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStep === 2 ? "bg-blue-500 text-white" : balance >= 0.1 ? "bg-green-500 text-black" : "bg-neutral-700 text-neutral-400"
                            }`}>
                            {balance >= 0.1 ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <span className="font-bold">2</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-medium ${currentStep === 2 ? "text-blue-400" : balance >= 0.1 ? "text-green-400" : "text-neutral-400"}`}>
                                Get Test Tokens
                            </h3>
                            {currentStep === 2 && (
                                <div className="mt-2 space-y-2">
                                    <div className="bg-neutral-800/50 rounded-md p-2 border border-neutral-700">
                                        <div className="text-xs text-neutral-400 mb-1">Your Movement Address:</div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-white font-mono flex-1 truncate min-w-0">
                                                {address}
                                            </code>
                                            <button
                                                onClick={handleCopyAddress}
                                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                                            >
                                                {copied ? "✓ Copied" : "Copy"}
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleGetTokens}
                                        className="w-full text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md transition-colors"
                                    >
                                        Go to Faucet
                                    </button>
                                    <p className="text-xs text-neutral-500">
                                        Faucet gives 10 MOVE tokens for testing
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Send Tip */}
                    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${currentStep === 3
                        ? "bg-yellow-400/10 border-yellow-400/20"
                        : "bg-neutral-800/50 border-neutral-800"
                        }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${currentStep === 3 ? "bg-yellow-400 text-black" : "bg-neutral-700 text-neutral-400"
                            }`}>
                            <span className="font-bold">3</span>
                        </div>
                        <div>
                            <h3 className={`font-medium ${currentStep === 3 ? "text-yellow-400" : "text-neutral-400"}`}>
                                Send First Tip
                            </h3>
                            <p className="text-xs text-neutral-500">Use the dashboard to send a test tip</p>
                        </div>
                    </div>
                </div>

                {currentStep === 3 && (
                    <button
                        onClick={onClose}
                        className="w-full btn-primary"
                    >
                        I'm ready!
                    </button>
                )}
            </div>
        </div>
    );
}
