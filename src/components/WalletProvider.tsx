/**
 * Aptos Wallet Provider for Movement Network
 * 
 * Configured to support both Petra (legacy plugin) and standard wallets (Razor, etc.)
 * Auto-connects to previously connected wallet on page reload
 */

'use client';

import { ReactNode, useEffect } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';

interface WalletProviderProps {
    children: ReactNode;
}

// Auto-reconnect wrapper component
function AutoReconnect({ children }: { children: ReactNode }) {
    const { connect, connected, wallet, account } = useWallet();

    useEffect(() => {
        const lastWallet = localStorage.getItem('aptos-wallet-name');

        // Auto-connect on mount if we have a saved wallet
        if (lastWallet && !connected) {
            try {
                connect(lastWallet);
            } catch (err) {
                console.log('Auto-reconnect failed:', err);
                localStorage.removeItem('aptos-wallet-name');
            }
        }
    }, [connect, connected]);

    useEffect(() => {
        // Save wallet name and address when connected
        if (connected && wallet?.name && account?.address) {
            localStorage.setItem('aptos-wallet-name', wallet.name);
            localStorage.setItem('movement_last_connected_address', account.address.toString());
        }
    }, [connected, wallet, account]);

    return <>{children}</>;
}

export function WalletProvider({ children }: WalletProviderProps) {
    return (
        <AptosWalletAdapterProvider
            autoConnect={true}
            onError={(error) => {
                console.error('Wallet adapter error:', error);
            }}
        >
            <AutoReconnect>
                {children}
            </AutoReconnect>
        </AptosWalletAdapterProvider>
    );
}
