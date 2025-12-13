/**
 * Wallet Connect Button
 * 
 * Button to connect/disconnect wallets (Petra, Razor, etc.) for Movement Network transactions
 */

'use client';

import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { formatMovementAddress, MOVEMENT_CHAIN_ID } from '@/lib/movement';
import { useState, useEffect } from 'react';
import { getBalance } from '@/lib/movementClient';
import { useRouter } from 'next/router';

export function WalletConnectButton() {
    const { connected, account, connect, disconnect, wallets, network } = useWallet();
    const [showModal, setShowModal] = useState(false);
    const [balance, setBalance] = useState<number>(0);
    const router = useRouter();

    // Helper to check if network is valid
    const isNetworkValid = () => {
        if (!network) return true; // Don't show error if network is not yet detected
        
        // Check by Chain ID
        if (network.chainId) {
            const chainId = network.chainId.toString();
            // 250: Movement Bardock
            // 177: Movement Porto (sometimes used)
            // 27: Aptos Testnet (sometimes used with custom RPC)
            return chainId === MOVEMENT_CHAIN_ID.toString() || chainId === '177' || chainId === '27';
        }

        // Check by Name if Chain ID is missing (some wallets)
        if (network.name) {
            const name = network.name.toLowerCase();
            return name.includes('movement') || name.includes('bardock') || name.includes('testnet');
        }

        return true; // Default to true to avoid false positives if we can't determine
    };

    // Fetch balance when connected
    useEffect(() => {
        const fetchBalance = async () => {
            if (connected && account) {
                try {
                    const bal = await getBalance(account.address.toString());
                    setBalance(bal);
                } catch (error) {
                    console.error('Failed to fetch balance:', error);
                }
            }
        };

        fetchBalance();

        // Refresh balance every 10 seconds
        const interval = setInterval(fetchBalance, 10000);
        return () => clearInterval(interval);
    }, [connected, account]);

    const handleConnect = async (walletName: any) => {
        try {
            await connect(walletName);
            setShowModal(false);
        } catch (error) {
            console.error('Failed to connect wallet:', error);
        }
    };

    const handleDisconnect = async () => {
        try {
            // Clear auto-connect data BEFORE disconnecting to prevent race conditions
            localStorage.removeItem('aptos-wallet-name');
            localStorage.removeItem('movement_last_connected_address');
            setBalance(0);

            await disconnect();

            // Redirect to home page
            router.push('/');
        } catch (error) {
            console.error('Failed to disconnect:', error);
        }
    };

    // Filter out unwanted wallets (social logins) and prioritize Petra/Razor
    const filteredWallets = wallets.filter(wallet => {
        const name = wallet.name.toLowerCase();
        return !name.includes('google') && !name.includes('facebook') && !name.includes('twitter') && !name.includes('discord');
    });

    // Helper to get install URL
    const getInstallUrl = (name: string) => {
        if (name.toLowerCase().includes('petra')) return 'https://petra.app/';
        if (name.toLowerCase().includes('razor')) return 'https://razorwallet.xyz/';
        if (name.toLowerCase().includes('nightly')) return 'https://nightly.app/';
        return '#';
    };

    if (connected && account) {
        return (
            <div className="flex items-center gap-4">
                {/* Network Check */}
                {!isNetworkValid() && (
                    <div className="hidden md:flex flex-col items-end justify-center px-4 py-2 bg-red-500/10 border border-red-500/50 rounded-xl min-w-[120px]">
                        <span className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-0.5">Network ({network?.chainId || '?'})</span>
                        <span className="text-sm font-bold text-red-500">
                            Wrong Network
                        </span>
                    </div>
                )}

                {/* Balance Box */}
                <div className="hidden md:flex flex-col items-end justify-center px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl min-w-[120px]">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-0.5">Balance</span>
                    <span className="text-sm font-bold text-[var(--accent)]">
                        {balance.toFixed(2)} MOVE
                    </span>
                </div>

                {/* Connected Wallet Box */}
                <div className="hidden md:flex flex-col items-end justify-center px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl min-w-[140px]">
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold mb-0.5">Connected Wallet</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatMovementAddress(account.address.toString())}
                    </span>
                </div>

                {/* Mobile Address (Simple) */}
                <div className="md:hidden flex items-center px-3 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-full">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatMovementAddress(account.address.toString())}
                    </span>
                </div>

                {/* Disconnect Button */}
                <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-all"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="bg-[var(--accent)] text-[var(--btn-text-primary)] font-bold px-6 py-2 rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/20"
            >
                Connect Wallet
            </button>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slideUp">
                        <div className="p-4 border-b border-[var(--card-border)] flex justify-between items-center">
                            <h3 className="text-lg font-bold text-[var(--text-primary)]">Connect Wallet</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {filteredWallets.length > 0 ? (
                                filteredWallets.map((wallet) => (
                                    <div
                                        key={wallet.name}
                                        className="w-full flex items-center justify-between p-3 bg-[var(--hover-bg)] hover:bg-[var(--card-border)] border border-[var(--card-border)] rounded-lg transition-colors group"
                                    >
                                        <button
                                            onClick={() => handleConnect(wallet.name)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 rounded-lg" />
                                            <span className="font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                                                {wallet.name}
                                            </span>
                                        </button>

                                        {wallet.readyState === 'Installed' ? (
                                            <span className="text-xs text-green-500 font-medium">Detected</span>
                                        ) : (
                                            <a
                                                href={getInstallUrl(wallet.name)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-[var(--accent)] hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Install
                                            </a>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-[var(--text-secondary)] text-center py-4 space-y-2">
                                    <p>No wallets detected.</p>
                                    <div className="flex flex-col gap-2 mt-4">
                                        <a href="https://razorwallet.xyz/" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline py-2">
                                            Install Razor Wallet
                                        </a>
                                        <a href="https://petra.app/" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline py-2">
                                            Install Petra Wallet
                                        </a>
                                        <a href="https://nightly.app/" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline py-2">
                                            Install Nightly Wallet
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full px-4 py-3 bg-[var(--hover-bg)] hover:bg-[var(--card-border)] text-[var(--text-primary)] font-medium transition-colors border-t border-[var(--card-border)]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
