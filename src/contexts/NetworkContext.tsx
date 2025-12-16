import React, { createContext, useContext, useEffect, useState } from 'react';
import { NetworkConfig, NETWORKS, NetworkType } from '@/lib/movement';

interface NetworkContextType {
    currentNetwork: NetworkType;
    networkConfig: NetworkConfig;
    switchNetwork: (network: NetworkType) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentNetwork, setCurrentNetwork] = useState<NetworkType>('testnet');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load network preference from localStorage on mount
        const savedNetwork = localStorage.getItem('movement_network') as NetworkType;
        if (savedNetwork && NETWORKS[savedNetwork]) {
            setCurrentNetwork(savedNetwork);
        }
        setMounted(true);
    }, []);

    const switchNetwork = (network: NetworkType) => {
        if (NETWORKS[network]) {
            setCurrentNetwork(network);
            localStorage.setItem('movement_network', network);
            // Optional: Reload page to ensure all clients update cleanly? 
            // Better to make clients reactive, but a reload ensures consistency if clients are initialized statically.
            // For now, let's try reactive, but if we have static clients (like in lib/movementClient.ts potentially), we might need reload.
            // Given getAptosClient is a function, if we pass the config to it, it's fine.
            // But if consumers call it without arguments and it uses a default constant... we have a problem.
            // I'll update movementClient.ts to be smarter.
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
