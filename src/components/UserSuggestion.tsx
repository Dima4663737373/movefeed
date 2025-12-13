import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatMovementAddress } from '@/lib/movement';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface UserSuggestionProps {
    creator: string;
    currentUserAddress: string;
    profile: {
        displayName?: string;
        avatar?: string;
    };
}

export default function UserSuggestion({ creator, currentUserAddress, profile }: UserSuggestionProps) {
    const { t } = useLanguage();
    const { account, signMessage } = useWallet();
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (currentUserAddress && creator) {
            // Check initial follow status
            fetch(`/api/follow?userAddress=${currentUserAddress}&targetAddress=${creator}`)
                .then(res => res.json())
                .then(data => setIsFollowing(data.isFollowing))
                .catch(console.error);
        }
    }, [currentUserAddress, creator]);

    const handleFollow = async () => {
        if (!currentUserAddress || !account) return;
        setLoading(true);
        try {
            // Sign message for authentication
            const timestamp = Date.now();
            const messageToSign = `Toggle follow for ${creator} by ${currentUserAddress} at ${timestamp}`;
            
            let signature, fullMessage;
            try {
                const response = await signMessage({
                    message: messageToSign,
                    nonce: timestamp.toString()
                });
                
                // Ensure signature is a hex string
                let sigData: any = response;
                if (typeof response !== 'string' && 'signature' in response) {
                    sigData = response.signature;
                    fullMessage = response.fullMessage;
                }
                
                // Handle object wrapper
                if (typeof sigData === 'object' && sigData !== null) {
                     if ('data' in (sigData as any)) {
                         sigData = (sigData as any).data;
                     }
                }

                if (typeof sigData === 'string') {
                    signature = sigData;
                } else if (Array.isArray(sigData) || sigData instanceof Uint8Array || (typeof sigData === 'object' && sigData !== null && Object.values(sigData).every((v: any) => typeof v === 'number'))) {
                    const bytes = Array.isArray(sigData) ? sigData : 
                                  (sigData instanceof Uint8Array ? sigData : Object.values(sigData));
                    signature = "0x" + Array.from(bytes as any[]).map((b: any) => b.toString(16).padStart(2, '0')).join('');
                } else {
                     console.warn("Unknown signature format:", sigData);
                     signature = String(sigData);
                }

                if (!fullMessage) fullMessage = messageToSign;

                if (!signature || (typeof signature === 'string' && !signature.startsWith('0x'))) {
                    if (typeof signature === 'string' && /^[0-9a-fA-F]+$/.test(signature)) {
                        signature = "0x" + signature;
                    } else {
                         throw new Error("Invalid signature format generated");
                    }
                }

            } catch (err) {
                console.error("User rejected signature", err);
                setLoading(false);
                return;
            }

            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: currentUserAddress,
                    targetAddress: creator,
                    signature,
                    message: fullMessage,
                    publicKey: Array.isArray(account.publicKey) 
                        ? account.publicKey[0].toString() 
                        : (typeof account.publicKey === 'object' ? account.publicKey.toString() : String(account.publicKey))
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
            } else {
                console.error("Follow failed", await res.text());
            }
        } catch (e) {
            console.error("Error toggling follow:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between">
            <Link href={`/u/${creator}`} className="flex items-center gap-3 group min-w-0">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex-shrink-0 overflow-hidden border border-[var(--card-border)]">
                    {profile.avatar ? (
                        <img src={profile.avatar} alt={creator} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-bold">
                            {profile.displayName ? profile.displayName[0].toUpperCase() : "U"}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                        {profile.displayName || formatMovementAddress(creator)}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">
                        {formatMovementAddress(creator)}
                    </div>
                </div>
            </Link>
            {currentUserAddress && (
                <button
                    onClick={handleFollow}
                    disabled={loading}
                    className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${isFollowing
                        ? 'bg-transparent border border-[var(--card-border)] text-[var(--text-primary)] hover:border-red-500 hover:text-red-500'
                        : 'bg-[var(--text-primary)] text-[var(--card-bg)] hover:opacity-90'
                        }`}
                >
                    {loading ? '...' : isFollowing ? t.followingBtn : t.follow}
                </button>
            )}
        </div>
    );
}
