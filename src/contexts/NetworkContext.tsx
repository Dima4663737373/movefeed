import React, { createContext, useContext, useEffect, useState } from 'react';
import { NetworkConfig, NETWORKS, NetworkType } from '@/lib/movement';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface NetworkContextType {
    currentNetwork: NetworkType;
    networkConfig: NetworkConfig;
    switchNetwork: (network: NetworkType) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('testnet');
    const [mounted, setMounted] = useState(false);
    const { changeNetwork: walletChangeNetwork, network: walletNetwork, connected } = useWallet();
    const [showNetworkModal, setShowNetworkModal] = useState(false);

    useEffect(() => {
        // Load network preference from localStorage on mount
        const savedNetwork = localStorage.getItem('movement_network') as NetworkType;
        if (savedNetwork && NETWORKS[savedNetwork]) {
            setCurrentNetwork(savedNetwork);
        }
        setMounted(true);
    }, []);

    // Auto-switch wallet network when site network matches and wallet is connected
    useEffect(() => {
        if (mounted && connected && walletNetwork && walletChangeNetwork) {
            const targetConfig = NETWORKS[currentNetwork];
            // Check if chainId matches (compare as string to be safe)
            // walletNetwork.chainId might be string or number depending on wallet
            if (walletNetwork.chainId && String(walletNetwork.chainId) !== String(targetConfig.chainId)) {
                console.log(`Network mismatch. Site: ${currentNetwork} (${targetConfig.chainId}), Wallet: ${walletNetwork.chainId}. Switching...`);
                
                walletChangeNetwork({ 
                    chainId: targetConfig.chainId,
                    name: targetConfig.networkName,
                    url: targetConfig.rpcUrl
                } as any).catch((err) => {
                    console.error("Auto-switch failed:", err);
                    setShowNetworkModal(true);
                });
            }
        }
    }, [mounted, connected, walletNetwork, currentNetwork, walletChangeNetwork]);

    const switchNetwork = async (network: NetworkType) => {
        if (NETWORKS[network]) {
            const targetConfig = NETWORKS[network];
            
            // Try to switch wallet network first
            if (walletChangeNetwork) {
                try {
                    console.log(`Attempting to switch wallet to ${network} (ChainID: ${targetConfig.chainId})`);
                    await walletChangeNetwork({ 
                        chainId: targetConfig.chainId,
                        name: targetConfig.networkName,
                        url: targetConfig.rpcUrl
                    } as any);
                } catch (e) {
                    console.error("Failed to switch wallet network:", e);
                    setShowNetworkModal(true);
                    // We continue to switch the site network even if wallet fails, 
                    // but we showed the modal so user knows.
                }
            }

            setCurrentNetwork(network);
            localStorage.setItem('movement_network', network);
            
            // Reload to ensure clean state
            window.location.reload(); 
        }
    };

    const value = {
        currentNetwork,
        networkConfig: NETWORKS[currentNetwork],
        switchNetwork
    };

    if (!mounted) {
        return null; // Or a loader
    }

    const targetConfig = NETWORKS[currentNetwork];

    return (
        <NetworkContext.Provider value={value}>
            {children}
            
            {/* Network Addition Modal */}
            {showNetworkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <button 
                            onClick={() => setShowNetworkModal(false)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Network Mismatch</h3>
                            <p className="text-[var(--text-secondary)]">
                                We couldn't automatically switch your wallet to <span className="text-[var(--accent)] font-bold">{targetConfig.networkName}</span>. 
                                Please add it manually.
                            </p>
                        </div>

                        <div className="space-y-4 bg-black/30 p-4 rounded-xl text-sm font-mono break-all">
                            <div>
                                <span className="text-[var(--text-secondary)] block text-xs uppercase tracking-wider mb-1">Network Name</span>
                                <div className="text-white bg-white/5 p-2 rounded select-all">{targetConfig.networkName}</div>
                            </div>
                            <div>
                                <span className="text-[var(--text-secondary)] block text-xs uppercase tracking-wider mb-1">RPC URL</span>
                                <div className="text-white bg-white/5 p-2 rounded select-all">{targetConfig.rpcUrl.startsWith('/') ? window.location.origin + targetConfig.rpcUrl : targetConfig.rpcUrl}</div>
                            </div>
                            <div>
                                <span className="text-[var(--text-secondary)] block text-xs uppercase tracking-wider mb-1">Chain ID</span>
                                <div className="text-white bg-white/5 p-2 rounded select-all">{targetConfig.chainId}</div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowNetworkModal(false)}
                            className="w-full mt-6 bg-[var(--accent)] text-black font-bold py-3 rounded-xl hover:bg-[var(--accent-hover)] transition-colors"
                        >
                            I've Added It
                        </button>
                    </div>
                </div>
            )}
        </NetworkContext.Provider>
    );
};

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
};
