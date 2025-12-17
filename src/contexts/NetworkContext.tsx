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
    const { changeNetwork: walletChangeNetwork } = useWallet();

    useEffect(() => {
        // Load network preference from localStorage on mount
        const savedNetwork = localStorage.getItem('movement_network') as NetworkType;
        if (savedNetwork && NETWORKS[savedNetwork]) {
            setCurrentNetwork(savedNetwork);
        }
        setMounted(true);
    }, []);

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
                    // Continue anyway, as the user might be using a wallet that doesn't support this
                    // or they might switch manually later.
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

    return (
        <NetworkContext.Provider value={value}>
            {children}
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
