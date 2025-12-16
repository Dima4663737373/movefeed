/**
 * Feed Page
 * 
 * Global feed showing posts from all users (like Twitter home feed)
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { NotificationButton } from "@/components/Notifications";
import PostCard from "@/components/PostCard";
import RightSidebar from "@/components/RightSidebar";
import { CreatePostForm } from "@/components/CreatePostForm";
import { getDisplayName, getUserPostsPaginated, getUserPostsCount, OnChainPost, getAvatar, getGlobalPostsCount, getAllPostsPaginated, getAllPosts, getPost } from "@/lib/microThreadsClient";
import { getTipHistory, getStats } from "@/lib/movementClient";
import { octasToMove, formatCompactNumber } from "@/lib/movement";
import AuthGuard from "@/components/AuthGuard";
import StatsBlock from "@/components/StatsBlock";
import LeftSidebar from "@/components/LeftSidebar";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FeedPage() {
    const { connected, account } = useWallet();
    const { t } = useLanguage();

    // Global Feed State
    const [globalPosts, setGlobalPosts] = useState<OnChainPost[]>([]);
    const [optimisticPosts, setOptimisticPosts] = useState<OnChainPost[]>([]);
    const [loadingGlobal, setLoadingGlobal] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [stats, setStats] = useState({ totalTips: 0, totalVolume: 0, topTipper: "" });
    const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

    // Profile State
    const [userPosts, setUserPosts] = useState<OnChainPost[]>([]);
    const [postsCount, setPostsCount] = useState(0);
    const [tipHistory, setTipHistory] = useState<any[]>([]);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [myDisplayName, setMyDisplayName] = useState("");
    const [myAvatar, setMyAvatar] = useState("");

    const userAddress = account?.address.toString() || "";

    // Fetch Global Posts & Stats
    const fetchGlobalData = async () => {
        setLoadingGlobal(true);

        try {
            // Get stats and global count first
            const [statsData, globalCount] = await Promise.all([
                getStats(),
                getGlobalPostsCount()
            ]);
            
            console.log("Global posts count:", globalCount);

            // Use pagination to fetch the latest posts
            // This ensures we get the newest content even if there are many posts
            const LIMIT = 50;
            const start = Math.max(0, globalCount - LIMIT);
            
            // We fetch all posts if count is small, or just the latest page
            // Note: getAllPostsPaginated handles fetching from chain
            let displayPosts: OnChainPost[] = [];
            
            // Try paginated fetch first
            try {
                displayPosts = await getAllPostsPaginated(start, LIMIT);
                console.log("Fetched posts via pagination:", displayPosts.length);
            } catch (e) {
                console.warn("Pagination fetch failed, trying fallback...", e);
            }

            // Fallback: If pagination returned nothing but we know there are posts,
            // try fetching them one by one (latest first)
            if (displayPosts.length === 0 && globalCount > 0) {
                console.log("Pagination returned empty. Entering fallback mode.");
                
                const fallbackPosts: OnChainPost[] = [];
                // Fetch ALL available posts if count is small (up to 20), otherwise last 20
                const fetchAmount = Math.min(globalCount, 20); 
                
                const idsToFetch = [];
                // Assuming IDs are 1-based and sequential.
                // If globalCount is 8, we want 8, 7, 6, 5, 4, 3, 2, 1
                for (let i = 0; i < fetchAmount; i++) {
                    idsToFetch.push(globalCount - i);
                }
                
                // Fetch in parallel
                const results = await Promise.all(
                    idsToFetch.map(async (id) => {
                        try {
                            const p = await getPost(id);
                            return p;
                        } catch (err) {
                            console.error(`Failed to fetch post ${id}:`, err);
                            return null;
                        }
                    })
                );
                
                results.forEach(post => {
                    if (post) fallbackPosts.push(post);
                });
                
                console.log("Fetched posts via fallback:", fallbackPosts.length);
                displayPosts = fallbackPosts;
            }
            
            // Fallback 2: If individual fetch also failed
            if (displayPosts.length === 0 && globalCount > 0) {
                 try {
                     const allPosts = await getAllPosts();
                     if (allPosts.length > 0) {
                         displayPosts = allPosts;
                     }
                 } catch (e) {
                     // ignore
                 }
            }

            // Sort by timestamp descending (newest first)
            displayPosts.sort((a, b) => b.timestamp - a.timestamp);
            
            // Calculate comment counts (only for visible posts)
            const counts: Record<number, number> = {};
            displayPosts.forEach(post => {
                if (post.is_comment && post.parent_id) {
                    counts[post.parent_id] = (counts[post.parent_id] || 0) + 1;
                }
            });
            setCommentCounts(counts);

            // Filter out current user's posts from global feed - REMOVED to show user's own posts
            // const displayPosts = allPosts; // .filter(post => post.creator !== userAddress);

            // Only update if data changed to avoid re-renders (blinking)
            const hasChanged = globalPosts.length !== displayPosts.length ||
                (globalPosts.length > 0 && displayPosts.length > 0 &&
                globalPosts[0].id !== displayPosts[0].id);

            if (hasChanged || globalPosts.length === 0) {
                setGlobalPosts(displayPosts);
                setStats(statsData);
                
                // Clear optimistic posts that are now in global posts
                if (optimisticPosts.length > 0) {
                    setOptimisticPosts(prev => prev.filter(op => !displayPosts.some(p => p.id === op.id)));
                }
            }

            // Load display names for other users
            const uniqueCreators = [...new Set(displayPosts.map(p => p.creator))];
            const profileMap: Record<string, any> = { ...profiles }; // Keep existing profiles
            let newProfilesFound = false;

            await Promise.all(uniqueCreators.map(async (creator) => {
                if (!profileMap[creator]) {
                    try {
                        const displayName = await getDisplayName(creator);
                        const avatar = await getAvatar(creator);
                        if (displayName || avatar) {
                            profileMap[creator] = { displayName, avatar };
                            newProfilesFound = true;
                        }
                    } catch (err) {
                        console.error(`Failed to load profile for ${creator}`, err);
                    }
                }
            }));

            if (newProfilesFound) {
                setProfiles(profileMap);
            }
        } catch (error) {
            console.error("Error fetching global data:", error);
        } finally {
            setLoadingGlobal(false);
        }
    };

    // Fetch Profile Data
    const fetchProfileData = async () => {
        if (!userAddress) return;

        setLoadingProfile(true);

        try {
            // Fetch count first for pagination logic
            const count = await getUserPostsCount(userAddress);
            const LIMIT = 20; 
            const start = Math.max(0, count - LIMIT);

            const [posts, tips, name, avatar] = await Promise.all([
                getUserPostsPaginated(userAddress, start, LIMIT),
                getTipHistory(),
                getDisplayName(userAddress),
                getAvatar(userAddress)
            ]);

            // Sort user posts by timestamp desc
            posts.sort((a, b) => b.timestamp - a.timestamp);

            setUserPosts(posts);
            setPostsCount(count);
            setMyDisplayName(name);
            setMyAvatar(avatar);

            const userTips = tips.filter((t: any) =>
                t.receiver === userAddress || t.sender === userAddress
            );
            setTipHistory(userTips);
        } catch (error) {
            console.error("Error fetching profile data:", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        if (connected) {
            fetchGlobalData();
            if (userAddress) fetchProfileData();
        }

        const handleRefresh = () => {
            if (connected) {
                fetchGlobalData();
                if (userAddress) fetchProfileData();
            }
        };
        window.addEventListener('tip_sent', handleRefresh);

        return () => {
            window.removeEventListener('tip_sent', handleRefresh);
        };
    }, [connected, userAddress]);

    // Calculate stats
    const totalTipsReceived = userPosts.reduce((acc, post) => acc + post.total_tips, 0);
    const totalTipsSent = tipHistory
        .filter((t: any) => t.sender === userAddress && t.type === 'sent')
        .reduce((acc, t) => acc + t.amount, 0);

    return (
        <AuthGuard>
            <Head>
                <title>Feed - MoveFeed</title>
            </Head>

            {/* Header - Movement Labs Style */}
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
                            {/* NotificationButton removed as per user request (duplicate) */}
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-custom pb-6 md:pb-10">
                <div className="max-w-[1280px] mx-auto">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px] gap-y-8 lg:gap-x-0 lg:divide-x lg:divide-[var(--card-border)]">
                        {/* LEFT SIDEBAR: Profile & Create Post */}
                        <div className="lg:pr-6 pt-6">
                            <div className="space-y-6">
                            {/* Navigation Sidebar */}
                            <LeftSidebar activePage="home" currentUserAddress={userAddress} displayName={myDisplayName} avatar={myAvatar} />
                        </div>
                    </div>

                        {/* CENTER: Feed */}
                        <div className="min-w-0">
                                
                                {loadingGlobal ? (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-[var(--card-bg)] border-b border-[var(--card-border)] p-4 animate-pulse h-32"></div>
                                        ))}
                                    </div>
                                ) : (globalPosts.length > 0 || optimisticPosts.length > 0) ? (
                                    <div>
                                        {[...optimisticPosts, ...globalPosts]
                                            // Filter out comments from the main feed
                                            .filter(post => !post.is_comment)
                                            // Deduplicate based on global_id if available, otherwise fallback to id
                                            .filter((post, index, self) => 
                                                index === self.findIndex((p) => {
                                                    if (p.global_id !== undefined && post.global_id !== undefined) {
                                                        return p.global_id === post.global_id;
                                                    }
                                                    return p.id === post.id;
                                                })
                                            )
                                            .map(post => (
                                            <PostCard
                                                key={post.global_id || post.id}
                                                post={{
                                                    id: post.id.toString(),
                                                    global_id: post.global_id,
                                                    creatorAddress: post.creator,
                                                    creatorHandle: profiles[post.creator]?.displayName || (post.creator === userAddress ? myDisplayName : undefined),
                                                    creatorAvatar: profiles[post.creator]?.avatar || (post.creator === userAddress ? myAvatar : undefined),
                                                    content: post.content,
                                                    image_url: post.image_url,
                                                    style: post.style,
                                                    totalTips: octasToMove(post.total_tips),
                                                    createdAt: post.timestamp * 1000,
                                                    commentCount: commentCounts[post.id] || 0
                                                }}
                                                isOwner={post.creator === userAddress}
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
                            </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="hidden xl:block xl:pl-6 pt-6">
                            <RightSidebar
                                posts={globalPosts}
                                stats={stats}
                                currentUserAddress={userAddress}
                                profiles={profiles}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </AuthGuard>
    );
}
