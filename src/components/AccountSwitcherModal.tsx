import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDisplayName, getAvatar, getProfile } from '@/lib/microThreadsClient';
import CreateProfileForm from './CreateProfileForm';
import { WalletConnectButton } from "@/components/WalletConnectButton";

interface AccountSwitcherModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserAddress: string;
}

interface KnownAccount {
    address: string;
    displayName: string;
    avatar: string;
    lastActive: number;
}

export default function AccountSwitcherModal({ isOpen, onClose, currentUserAddress }: AccountSwitcherModalProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const { disconnect, connect, wallets, connected, account: currentAccount } = useWallet();
    const [knownAccounts, setKnownAccounts] = useState<KnownAccount[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [waitingForConnection, setWaitingForConnection] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [initialAddress, setInitialAddress] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadKnownAccounts();
            setInitialAddress(currentUserAddress);
            // Reset states
            setIsCreating(false);
            setWaitingForConnection(false);
            setIsRegistering(false);
        }
    }, [isOpen, currentUserAddress]);

    // Monitor connection changes when waiting for new account
    useEffect(() => {
        if (waitingForConnection && connected && currentAccount) {
            handleNewConnection(currentAccount.address.toString());
        }
    }, [waitingForConnection, connected, currentAccount]);

    const handleNewConnection = async (address: string) => {
        setWaitingForConnection(false);
        
        // Check if profile exists
        try {
            const profile = await getProfile(address);
            if (profile) {
                // Profile exists, just add to known accounts
                await fetchCurrentProfile(knownAccounts, address);
                // We are already connected, so just close
                onClose();
            } else {
                // No profile, show creation form
                setIsCreating(true);
            }
        } catch (e: any) {
            // Silence 404/not found errors as they just mean we need to create a profile
            if (e?.status !== 404 && !e?.message?.includes("resource_not_found")) {
                 console.error("Error checking profile", e);
            }
            setIsCreating(true);
        }
    };

    const loadKnownAccounts = () => {
        try {
            const stored = localStorage.getItem('known_accounts');
            if (stored) {
                const accounts: KnownAccount[] = JSON.parse(stored);
                // Update current user's info if present
                if (currentUserAddress) {
                    const exists = accounts.find(a => a.address === currentUserAddress);
                    if (!exists) {
                        // We will add it when we fetch profile
                        fetchCurrentProfile(accounts, currentUserAddress);
                    } else {
                        setKnownAccounts(accounts.sort((a, b) => b.lastActive - a.lastActive));
                    }
                } else {
                    setKnownAccounts(accounts.sort((a, b) => b.lastActive - a.lastActive));
                }
            } else if (currentUserAddress) {
                fetchCurrentProfile([], currentUserAddress);
            }
        } catch (e) {
            console.error("Error loading accounts", e);
        }
    };

    const fetchCurrentProfile = async (currentAccounts: KnownAccount[], address: string) => {
        if (!address) return;
        try {
            const displayName = await getDisplayName(address);
            const avatar = await getAvatar(address);
            
            const newAccount: KnownAccount = {
                address: address,
                displayName: displayName || formatAddress(address),
                avatar: avatar || '',
                lastActive: Date.now()
            };

            const updated = [
                ...currentAccounts.filter(a => a.address !== address),
                newAccount
            ];
            
            localStorage.setItem('known_accounts', JSON.stringify(updated));
            setKnownAccounts(updated.sort((a, b) => b.lastActive - a.lastActive));
        } catch (e) {
            console.error("Error fetching profile for switcher", e);
        }
    };

    const formatAddress = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const handleAccountSelect = async (account: KnownAccount) => {
        if (account.address === currentUserAddress) {
            onClose();
            return;
        }

        try {
            await disconnect();
            onClose();
            // Prompt user
            alert(`Please switch to account ${account.displayName} (${formatAddress(account.address)}) in your wallet extension.`);
            // Reload to clear state and prompt connect
            window.location.reload(); 
        } catch (e) {
            console.error("Error switching", e);
        }
    };

    const handleAddAccount = async (register: boolean = false) => {
        try {
            // Flag that we are intentionally switching accounts
            localStorage.setItem('switching_account', 'true');
            if (currentUserAddress) {
                localStorage.setItem('previous_account', currentUserAddress);
            }
            
            await disconnect();
            onClose();
            // Redirect to landing page to connect new wallet using router to avoid auto-connect loop
            router.push('/');
        } catch (e) {
            console.error("Error preparing add account", e);
        }
    };

    const handleCreateSuccess = async () => {
        if (currentAccount) {
            await fetchCurrentProfile(knownAccounts, currentAccount.address.toString());
        }
        onClose();
    };

    const handleRemoveAccount = (address: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = knownAccounts.filter(a => a.address !== address);
        setKnownAccounts(updated);
        localStorage.setItem('known_accounts', JSON.stringify(updated));
    };

    if (!isOpen) return null;

    // View: Create Profile
    if (isCreating) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Create Profile</h2>
                        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6">
                        <CreateProfileForm onSuccess={handleCreateSuccess} onCancel={onClose} />
                    </div>
                </div>
            </div>
        );
    }

    // View: Waiting for Connection
    if (waitingForConnection) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto text-[var(--accent)]">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                                {isRegistering ? "Create New Account" : "Connect Existing Account"}
                            </h2>
                            <p className="text-[var(--text-secondary)]">
                                {isRegistering 
                                    ? "Please create or select a new account in your wallet extension, then connect." 
                                    : "Please switch to the account you want to add in your wallet extension, then connect."}
                            </p>
                        </div>
                        
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)] text-left">
                            <p className="text-sm font-medium mb-2">Steps:</p>
                            <ol className="list-decimal list-inside text-sm space-y-1 text-[var(--text-secondary)]">
                                <li>Open your wallet extension</li>
                                <li>
                                    {isRegistering 
                                        ? "Create a new wallet address" 
                                        : "Switch to your other wallet address"}
                                </li>
                                <li>Click the Connect button below</li>
                            </ol>
                        </div>

                        <div className="flex justify-center">
                            <WalletConnectButton />
                        </div>

                        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Switch Account</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-2 max-h-[60vh] overflow-y-auto">
                    {knownAccounts.map(acc => (
                        <div
                            key={acc.address}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[var(--hover-bg)] rounded-xl transition-colors group cursor-pointer"
                            onClick={() => handleAccountSelect(acc)}
                        >
                            <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden shrink-0 border border-[var(--card-border)]">
                                {acc.avatar ? (
                                    <img src={acc.avatar} alt={acc.displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] font-bold">
                                        {acc.displayName[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-[var(--text-primary)] truncate">{acc.displayName}</span>
                                    {acc.address === currentUserAddress && (
                                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    )}
                                </div>
                                <span className="text-sm text-[var(--text-secondary)] truncate block">{formatAddress(acc.address)}</span>
                            </div>
                            <button 
                                onClick={(e) => handleRemoveAccount(acc.address, e)}
                                className="p-2 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove account"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-[var(--card-border)] space-y-2">
                    {knownAccounts.length >= 3 ? (
                        <div className="p-4 text-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--card-border)]">
                            <p className="text-[var(--text-primary)] font-bold mb-1">Account limit reached</p>
                            <p className="text-sm text-[var(--text-secondary)]">Remove an account to add a new one.</p>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => handleAddAccount(false)}
                                className="w-full py-3 px-4 rounded-xl border border-[var(--card-border)] text-[var(--text-primary)] font-bold hover:bg-[var(--hover-bg)] transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add an existing account
                            </button>
                            <button 
                                onClick={() => handleAddAccount(true)}
                                className="w-full py-3 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-primary)] font-bold hover:opacity-90 transition-opacity"
                            >
                                Create a new account
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
