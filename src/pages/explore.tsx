/**
 * Explore Page
 * 
 * Discover trending posts and popular content
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import PostCard from "@/components/PostCard";
import { SearchBar } from "@/components/SearchBar";
import RightSidebar from "@/components/RightSidebar";
import { getDisplayName, OnChainPost, getAvatar, getAllPostsPaginated, getGlobalPostsCount } from "@/lib/microThreadsClient";
import { getStats } from "@/lib/movementClient";
import { octasToMove } from "@/lib/movement";
import AuthGuard from "@/components/AuthGuard";
import LeftSidebar from "@/components/LeftSidebar";

export default function ExplorePage() {
    const { connected, account } = useWallet();
    const [posts, setPosts] = useState<OnChainPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [stats, setStats] = useState({ totalTips: 0, totalVolume: 0, topTipper: "" });
    const [myDisplayName, setMyDisplayName] = useState("");
    const [myAvatar, setMyAvatar] = useState("");

    const userAddress = account?.address.toString() || "";

    const fetchData = async () => {
        setLoading(true);
        try {
            const [globalCount, statsData] = await Promise.all([
                getGlobalPostsCount(),
                getStats()
            ]);

            // For Explore/Trending, we fetch a larger chunk of recent posts
            // In a real app, this would use a dedicated indexer or trending API
            // For now, we fetch the last 100 posts and sort by tips
            const LIMIT = 100;
            const start = Math.max(0, globalCount - LIMIT);
            
            const allPosts = await getAllPostsPaginated(start, LIMIT);

            // Sort by total tips (trending)
            const sortedPosts = [...allPosts].sort((a, b) => b.total_tips - a.total_tips);
            setPosts(sortedPosts);
            setStats(statsData);

            // Load profiles
            const uniqueCreators = [...new Set(sortedPosts.map(p => p.creator))];
            const profileMap: Record<string, any> = {};

            await Promise.all(uniqueCreators.map(async (creator) => {
                try {
                    const displayName = await getDisplayName(creator);
                    const avatar = await getAvatar(creator);
                    if (displayName || avatar) {
                        profileMap[creator] = { displayName, avatar };
                    }
                } catch (err) {
                    console.error(`Failed to load profile for ${creator}`, err);
                }
            }));

            setProfiles(profileMap);

            // Load current user profile
            if (userAddress) {
                try {
                    const name = await getDisplayName(userAddress);
                    const userAvatar = await getAvatar(userAddress);
                    setMyDisplayName(name);
                    setMyAvatar(userAvatar);
                } catch (err) {
                    console.error('Failed to load user profile', err);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connected) {
            fetchData();
        }
    }, [connected]);

    return (
        <AuthGuard>
            <Head>
                <title>Explore - MoveFeed</title>
            </Head>

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
                        <div className="lg:pr-6">
                            <LeftSidebar activePage="explore" currentUserAddress={userAddress} displayName={myDisplayName} avatar={myAvatar} />
                        </div>

                        {/* CENTER: Trending Posts */}
                        <div className="min-w-0 lg:px-6">
                            <div className="mb-8">
                                <SearchBar posts={posts} profiles={profiles} />
                            </div>

                            <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Trending</h2>
                                <button
                                    onClick={fetchData}
                                    className="p-2 text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-full transition-colors"
                                    title="Refresh"
                                >
                                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>

                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-[var(--card-bg)] border-b border-[var(--card-border)] p-4 animate-pulse h-32"></div>
                                    ))}
                                </div>
                            ) : posts.length > 0 ? (
                                <div className="border-t border-[var(--card-border)]">
                                    {posts.map(post => (
                                        <PostCard
                                            key={post.id}
                                            post={{
                                                id: post.id.toString(),
                                                creatorAddress: post.creator,
                                                creatorHandle: profiles[post.creator]?.displayName,
                                                creatorAvatar: profiles[post.creator]?.avatar,
                                                content: post.content,
                                                image_url: post.image_url,
                                                style: post.style,
                                                totalTips: octasToMove(post.total_tips),
                                                createdAt: post.timestamp * 1000
                                            }}
                                            isOwner={post.creator === userAddress}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center border-t border-[var(--card-border)]">
                                    <div className="w-16 h-16 bg-[var(--card-border)] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No Trending Posts</h3>
                                    <p className="text-[var(--text-secondary)]">Check back later for trending content!</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="hidden xl:block xl:pl-6">
                            <RightSidebar
                                posts={posts}
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
