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
            // Simplified follow (no signature required)
            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: currentUserAddress,
                    targetAddress: creator
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
