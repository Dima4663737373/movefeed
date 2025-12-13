import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Hex } from "@aptos-labs/ts-sdk";
import Link from 'next/link';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { formatMovementAddress, octasToMove } from '@/lib/movement';
import { getDisplayName, setDisplayName, getUserTipStats, getAvatar, setAvatar, getUserPostsPaginated, getUserPostsCount, OnChainPost, getGlobalPostsCount, getAllPostsPaginated } from '@/lib/microThreadsClient';
import { getTipHistory, getStats } from '@/lib/movementClient';
import TipHistory from '@/components/TipHistory';
import PostCard from '@/components/PostCard';
import Head from 'next/head';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import AuthGuard from '@/components/AuthGuard';
import UserListModal from '@/components/UserListModal';
import { CreatePostForm } from '@/components/CreatePostForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreatorPage() {
    const router = useRouter();
    const { handle } = router.query;
    const { t } = useLanguage();
    const { account, signAndSubmitTransaction, signMessage } = useWallet();

    const address = handle as string;
    const isOwner = account?.address.toString() === address;
    const currentUserAddress = account?.address.toString() || "";

    // Profile Data
    const [displayName, setDisplayNameState] = useState<string>('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [location, setLocation] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    
    const [tips, setTips] = useState<any[]>([]);
    const [userStats, setUserStats] = useState({ totalSent: 0, totalReceived: 0, tipsSentCount: 0 });
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // Edit State
    const [editName, setEditName] = useState('');
    const [editAvatar, setEditAvatar] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editWebsite, setEditWebsite] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editBanner, setEditBanner] = useState('');
    
    const [saving, setSaving] = useState(false);
    const [userPosts, setUserPosts] = useState<OnChainPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // UI State
    const [activeTab, setActiveTab] = useState<'posts' | 'received' | 'sent'>('posts');
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [followersList, setFollowersList] = useState<string[]>([]);
    const [followingList, setFollowingList] = useState<string[]>([]);

    const handleShowFollowers = async () => {
        if (followersCount === 0) return;
        setShowFollowers(true);
        try {
            const res = await fetch(`/api/follow?targetAddress=${address}&includeLists=true`);
            const data = await res.json();
            setFollowersList(data.followers || []);
        } catch(e) { console.error(e); }
    };

    const handleShowFollowing = async () => {
        if (followingCount === 0) return;
        setShowFollowing(true);
        try {
            const res = await fetch(`/api/follow?targetAddress=${address}&includeLists=true`);
            const data = await res.json();
            setFollowingList(data.following || []);
        } catch(e) { console.error(e); }
    };

    // Global Data for Right Sidebar
    const [globalPosts, setGlobalPosts] = useState<OnChainPost[]>([]);
    const [globalStats, setGlobalStats] = useState({ totalTips: 0, totalVolume: 0, topTipper: "" });
    const [profiles, setProfiles] = useState<Record<string, any>>({});

    useEffect(() => {
        if (address) {
            const fetchData = async () => {
                try {
                    const name = await getDisplayName(address);
                    if (name) setDisplayNameState(name);

                    const avatar = await getAvatar(address);
                    if (avatar) setAvatarUrl(avatar);
                    
                    // Fetch extended profile from Supabase
                    try {
                        const res = await fetch(`/api/profile?address=${address}`);
                        if (res.ok) {
                            const data = await res.json();
                            setBio(data.bio || '');
                            setWebsite(data.website || '');
                            setLocation(data.location || '');
                            setBannerUrl(data.banner_url || '');
                        }
                    } catch (e) {
                        console.error("Error fetching extended profile:", e);
                    }

                    const userTips = await getTipHistory(address);
                    setTips(userTips);

                    const stats = await getUserTipStats(address);
                    setUserStats(stats);

                    // Fetch user posts
                    setLoadingPosts(true);
                    try {
                        const postsCount = await getUserPostsCount(address);
                        const LIMIT = 5; // Reduced for testing
                        const start = Math.max(0, postsCount - LIMIT);
                        const posts = await getUserPostsPaginated(address, start, LIMIT);
                        // Sort by timestamp desc
                        posts.sort((a, b) => b.timestamp - a.timestamp);
                        setUserPosts(posts);
                    } catch (err) {
                        console.error("Error fetching user posts:", err);
                        setUserPosts([]);
                    }
                    setLoadingPosts(false);

                    // Fetch global data for sidebar (paginated)
                    const [gStats, globalCount] = await Promise.all([
                        getStats(),
                        getGlobalPostsCount()
                    ]);
                    setGlobalStats(gStats);

                    const LIMIT = 50;
                    const start = Math.max(0, globalCount - LIMIT);
                    const allPosts = await getAllPostsPaginated(start, LIMIT);
                    setGlobalPosts(allPosts);

                    // Calculate comment counts (based on recent posts)
                    const counts: Record<number, number> = {};
                    allPosts.forEach(post => {
                        if (post.is_comment && post.parent_id) {
                            counts[post.parent_id] = (counts[post.parent_id] || 0) + 1;
                        }
                    });
                    setCommentCounts(counts);

                    // Load profiles for sidebar suggestions
                    const uniqueCreators = [...new Set(allPosts.map(p => p.creator))].slice(0, 5);
                    const profileMap: Record<string, any> = {};

                    await Promise.all(uniqueCreators.map(async (creator) => {
                        try {
                            const dName = await getDisplayName(creator);
                            const dAvatar = await getAvatar(creator);
                            if (dName || dAvatar) {
                                profileMap[creator] = { displayName: dName, avatar: dAvatar };
                            }
                        } catch (e) { console.error(e); }
                    }));
                    setProfiles(profileMap);

                    // Check Follow Status (API)
                    if (currentUserAddress) {
                        try {
                            const res = await fetch(`/api/follow?userAddress=${currentUserAddress}&targetAddress=${address}`);
                            const data = await res.json();
                            setIsFollowing(data.isFollowing);
                            setFollowersCount(data.followersCount);
                            setFollowingCount(data.followingCount);
                        } catch (e) {
                            console.error("Error fetching follow status:", e);
                        }
                    } else {
                        // Just fetch counts if not logged in
                        try {
                            const res = await fetch(`/api/follow?targetAddress=${address}`);
                            const data = await res.json();
                            setFollowersCount(data.followersCount);
                            setFollowingCount(data.followingCount);
                        } catch (e) {
                            console.error("Error fetching follow counts:", e);
                        }
                    }

                } catch (e) {
                    console.error("Error fetching data", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();

            const handleTipSent = () => fetchData();
            window.addEventListener('tip_sent', handleTipSent);
            window.addEventListener('comment_added', handleTipSent);

            return () => {
                window.removeEventListener('tip_sent', handleTipSent);
                window.removeEventListener('comment_added', handleTipSent);
            };
        }
    }, [address, currentUserAddress]);

    useEffect(() => {
        if (displayName) setEditName(displayName);
        if (avatarUrl) setEditAvatar(avatarUrl);
        setEditBio(bio);
        setEditWebsite(website);
        setEditLocation(location);
        setEditBanner(bannerUrl);
    }, [displayName, avatarUrl, bio, website, location, bannerUrl]);

    const handleSaveProfile = async () => {
        try {
            setSaving(true);

            // Update on-chain data if changed
            if (editName.trim() && editName !== displayName) {
                await setDisplayName(editName, signAndSubmitTransaction);
                setDisplayNameState(editName);
            }

            if (editAvatar.trim() !== avatarUrl) {
                await setAvatar(editAvatar, signAndSubmitTransaction);
                setAvatarUrl(editAvatar);
            }

            // Update extended profile in Supabase
            try {
                // Sign message for authentication
                const timestamp = Date.now();
                const messageToSign = `Update profile for ${address} at ${timestamp}`;
                
                let signature, fullMessage;
                try {
                    const response = await signMessage({
                        message: messageToSign,
                        nonce: timestamp.toString()
                    });
                    
                    // Ensure signature is a hex string
                    if (typeof response.signature === 'string') {
                        signature = response.signature;
                    } else if (Array.isArray(response.signature) || response.signature instanceof Uint8Array) {
                        // Manual conversion for array/Uint8Array to hex string
                        // @ts-ignore
                        signature = Array.from(response.signature)
                            .map((b: any) => b.toString(16).padStart(2, '0'))
                            .join('');
                    } else if (typeof response.signature === 'object' && response.signature !== null) {
                        // Handle object case (e.g. { data: Uint8Array } or Ed25519Signature object)
                        const sigObj = response.signature as any;
                        if (sigObj.data && (Array.isArray(sigObj.data) || sigObj.data instanceof Uint8Array)) {
                             signature = Array.from(sigObj.data)
                                .map((b: any) => b.toString(16).padStart(2, '0'))
                                .join('');
                        } else {
                             // Try toString as fallback
                             signature = sigObj.toString();
                             // console.warn("Signature object handled via toString:", signature);
                        }
                    } else {
                         // Fallback
                         console.error("Unknown signature format:", response.signature);
                         signature = String(response.signature);
                    }
                    
                    // Clean signature (remove 0x prefix if present) just in case
                    if (signature.startsWith('0x')) {
                        signature = signature.slice(2);
                    }
                    
                    fullMessage = response.fullMessage;
                } catch (err) {
                    console.error("User rejected signature", err);
                    setSaving(false);
                    return;
                }

                const res = await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        wallet_address: address,
                        bio: editBio,
                        website: editWebsite,
                        location: editLocation,
                        banner_url: editBanner,
                        signature,
                        message: fullMessage,
                        publicKey: account?.publicKey?.toString()
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setBio(data.bio);
                    setWebsite(data.website);
                    setLocation(data.location);
                    setBannerUrl(data.banner_url);
                } else {
                    const err = await res.json();
                    console.error("Failed to update extended profile:", err);
                    alert(`Error: ${err.error}`);
                }
            } catch (e) {
                console.error("Error saving to Supabase:", e);
            }

            setIsEditing(false);
            alert(t.profileUpdated);
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert(t.profileUpdateError);
        } finally {
            setSaving(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUserAddress) return;

        try {
            // Sign message for authentication
            const timestamp = Date.now();
            const messageToSign = `Toggle follow for ${address} by ${currentUserAddress} at ${timestamp}`;
            
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
                return;
            }

            const res = await fetch('/api/follow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userAddress: currentUserAddress,
                    targetAddress: address,
                    signature,
                    message: fullMessage,
                    publicKey: account?.publicKey 
                        ? (Array.isArray(account.publicKey) 
                            ? account.publicKey[0].toString() 
                            : (typeof account.publicKey === 'object' ? account.publicKey.toString() : String(account.publicKey)))
                        : undefined
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
                setFollowersCount(data.followersCount);
                setFollowingCount(data.followingCount);
            } else {
                console.error("Follow failed", await res.text());
            }
        } catch (e) {
            console.error("Error toggling follow:", e);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert(t.imageTooLarge5MB);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Resize to max 400x400 for avatar
                const maxSize = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setEditAvatar(compressedBase64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--card-bg)] text-[var(--text-primary)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <Head>
                <title>{displayName || formatMovementAddress(address)} - MoveFeed</title>
            </Head>

            {/* Header */}
            <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] sticky top-0 z-40 transition-colors duration-300">
                <div className="container-custom py-6">
                    <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/feed'}>
                            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg">
                                <span className="text-black font-bold text-xl">M</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">MOVEFEED</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <WalletConnectButton />
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-custom py-6 md:py-10">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px] gap-y-8 lg:gap-x-0 lg:divide-x lg:divide-[var(--card-border)]">

                        {/* LEFT SIDEBAR */}
                        <div className="lg:pr-6 space-y-6">
                            <LeftSidebar activePage="profile" currentUserAddress={currentUserAddress} />
                            
                            {isOwner && (
                                <CreatePostForm onPostCreated={(newPost) => {
                                    if (newPost) {
                                        setUserPosts(prev => [newPost, ...prev]);
                                    }
                                    // Refresh stats if needed
                                }} />
                            )}
                        </div>

                        {/* CENTER: Profile Info & Posts */}
                        <div className="space-y-8 min-w-0 lg:px-6">
                            {/* Profile Header Card */}
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden relative">
                                {/* Cover Image */}
                                <div className="h-48 relative bg-gradient-to-r from-neutral-800 to-neutral-900 group">
                                    {(bannerUrl || editBanner) && (
                                        <img 
                                            src={isEditing ? editBanner : bannerUrl} 
                                            alt="Banner" 
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    {isEditing && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <input
                                                type="text"
                                                value={editBanner}
                                                onChange={(e) => setEditBanner(e.target.value)}
                                                placeholder={t.bannerPlaceholder}
                                                className="bg-[var(--card-bg)] px-4 py-2 rounded-lg text-sm w-64 border border-[var(--card-border)] focus:border-[var(--accent)] outline-none text-[var(--text-primary)]"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 pb-8">
                                    <div className="flex justify-between items-end -mt-16 mb-6">
                                        <div className="relative group">
                                            <div className="w-32 h-32 rounded-full bg-[var(--card-bg)] p-1">
                                                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FFEB3B] to-[#FFC107] flex items-center justify-center text-4xl font-bold text-black overflow-hidden border-4 border-[var(--card-bg)]">
                                                    {isEditing ? (
                                                        editAvatar ? (
                                                            <img src={editAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-white">
                                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                        )
                                                    ) : avatarUrl ? (
                                                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{displayName ? displayName[0].toUpperCase() : "U"}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </button>
                                            )}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageSelect}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            {!isOwner && (
                                                <button
                                                    onClick={handleFollow}
                                                    className={`px-6 py-2 rounded-full font-bold transition-all ${isFollowing
                                                        ? 'bg-transparent border border-[var(--card-border)] text-[var(--text-primary)] hover:border-red-500 hover:text-red-500'
                                                        : 'bg-[var(--text-primary)] text-[var(--card-bg)] hover:opacity-90'
                                                        }`}
                                                >
                                                    {isFollowing ? t.followingBtn : t.follow}
                                                </button>
                                            )}

                                            {isOwner && (
                                                <div>
                                                    {isEditing ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setIsEditing(false)}
                                                                className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--text-primary)] font-bold hover:bg-[var(--card-border)] transition-colors"
                                                                disabled={saving}
                                                            >
                                                                {t.cancel}
                                                            </button>
                                                            <button
                                                                onClick={handleSaveProfile}
                                                                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--btn-text-primary)] font-bold hover:opacity-90 transition-opacity"
                                                                disabled={saving}
                                                            >
                                                                {saving ? t.saving : t.saveProfile}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setIsEditing(true)}
                                                            className="px-4 py-2 rounded-xl border border-[var(--card-border)] text-[var(--text-primary)] font-bold hover:bg-[var(--card-border)] transition-colors"
                                                        >
                                                            {t.editProfile}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="text-3xl font-bold bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-2 py-1 text-[var(--text-primary)] w-full max-w-md mb-1 focus:outline-none focus:border-[var(--accent)]"
                                                placeholder={t.displayNamePlaceholder}
                                            />
                                        ) : (
                                            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{displayName || "Anonymous User"}</h1>
                                        )}
                                        <div className="text-[var(--text-secondary)] font-mono flex items-center gap-2 mb-4">
                                            {formatMovementAddress(address)}
                                            <button
                                                onClick={() => navigator.clipboard.writeText(address)}
                                                className="hover:text-[var(--accent)] transition-colors"
                                                title={t.copyAddress}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Extended Profile Info */}
                                        <div className="space-y-3 mb-6">
                                            {isEditing ? (
                                                <div className="space-y-3 max-w-lg">
                                                    <textarea
                                                        value={editBio}
                                                        onChange={(e) => setEditBio(e.target.value)}
                                                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                                                        placeholder={t.bioPlaceholder}
                                                        rows={3}
                                                    />
                                                    <div className="flex gap-4">
                                                        <input
                                                            type="text"
                                                            value={editLocation}
                                                            onChange={(e) => setEditLocation(e.target.value)}
                                                            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                                            placeholder={t.locationPlaceholder}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={editWebsite}
                                                            onChange={(e) => setEditWebsite(e.target.value)}
                                                            className="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                                            placeholder={t.websitePlaceholder}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {bio && <p className="text-[var(--text-primary)] whitespace-pre-wrap">{bio}</p>}
                                                    <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                                                        {location && (
                                                            <div className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {location}
                                                            </div>
                                                        )}
                                                        {website && (
                                                            <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--accent)] transition-colors">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                                </svg>
                                                                {website}
                                                            </a>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex gap-6 text-[var(--text-secondary)]">
                                            <div 
                                                className="flex gap-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={handleShowFollowing}
                                            >
                                                <span className="font-bold text-[var(--text-primary)]">{followingCount}</span>
                                                <span>{t.following}</span>
                                            </div>
                                            <div 
                                                className="flex gap-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                                onClick={handleShowFollowers}
                                            >
                                                <span className="font-bold text-[var(--text-primary)]">{followersCount}</span>
                                                <span>{t.followers}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="flex gap-8 border-t border-[var(--card-border)] pt-6">
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)] text-xl">{userPosts.length}</span>
                                            <span className="text-[var(--text-secondary)] ml-2">{t.posts}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)] text-xl">{octasToMove(userStats.totalReceived).toFixed(2)}</span>
                                            <span className="text-[var(--text-secondary)] ml-2">{t.moveReceived}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-[var(--text-primary)] text-xl">{octasToMove(userStats.totalSent).toFixed(2)}</span>
                                            <span className="text-[var(--text-secondary)] ml-2">{t.moveSent}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Content Tabs */}
                            <div className="border-b border-[var(--card-border)] flex gap-8 px-4">
                                <button
                                    onClick={() => setActiveTab('posts')}
                                    className={`py-4 border-b-2 font-bold transition-colors ${activeTab === 'posts'
                                        ? 'border-[var(--accent)] text-[var(--text-primary)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {t.posts}
                                </button>
                                <button
                                    onClick={() => setActiveTab('received')}
                                    className={`py-4 border-b-2 font-bold transition-colors ${activeTab === 'received'
                                        ? 'border-[var(--accent)] text-[var(--text-primary)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {t.tipsReceived}
                                </button>
                                <button
                                    onClick={() => setActiveTab('sent')}
                                    className={`py-4 border-b-2 font-bold transition-colors ${activeTab === 'sent'
                                        ? 'border-[var(--accent)] text-[var(--text-primary)]'
                                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {t.tipsSent}
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="min-w-0">
                                {activeTab === 'posts' && (
                                    <>
                                        {loadingPosts ? (
                                            <div className="space-y-4">
                                                {[1, 2].map(i => (
                                                    <div key={i} className="bg-[var(--card-bg)] border-b border-[var(--card-border)] p-4 animate-pulse h-32"></div>
                                                ))}
                                            </div>
                                        ) : userPosts.length > 0 ? (
                                            <div className="border-t border-[var(--card-border)]">
                                                {userPosts.map(post => (
                                                    <PostCard
                                                        key={post.id}
                                                        post={{
                                                            id: post.id.toString(),
                                                            creatorAddress: post.creator,
                                                            creatorHandle: displayName,
                                                            creatorAvatar: avatarUrl,
                                                            content: post.content,
                                                            image_url: post.image_url,
                                                            style: post.style,
                                                            totalTips: octasToMove(post.total_tips),
                                                            createdAt: post.timestamp * 1000,
                                                            commentCount: commentCounts[post.id] || 0
                                                        }}
                                                        isOwner={isOwner}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center border-t border-[var(--card-border)]">
                                                <div className="w-16 h-16 bg-[var(--card-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t.noPostsTitle}</h3>
                                                <p className="text-[var(--text-secondary)]">{t.noPostsDesc}</p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'received' && (
                                    <TipHistory
                                        tips={tips.filter(t => t.receiver === address)}
                                        loading={loading}
                                    />
                                )}

                                {activeTab === 'sent' && (
                                    <TipHistory
                                        tips={tips.filter(t => t.sender === address)}
                                        loading={loading}
                                    />
                                )}
                            </div>
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="hidden xl:block xl:pl-6">
                            <RightSidebar
                                posts={globalPosts}
                                stats={globalStats}
                                currentUserAddress={currentUserAddress}
                                profiles={profiles}
                            />
                        </div>
                    </div>
                </div>
            </main>

            <UserListModal
                isOpen={showFollowers}
                onClose={() => setShowFollowers(false)}
                title="Followers"
                users={followersList}
                currentUserAddress={currentUserAddress}
            />

            <UserListModal
                isOpen={showFollowing}
                onClose={() => setShowFollowing(false)}
                title="Following"
                users={followingList}
                currentUserAddress={currentUserAddress}
            />
        </AuthGuard>
    );
}
