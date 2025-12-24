/**
 * Hashtag Page
 * 
 * Displays posts containing a specific hashtag
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import RightSidebar from "@/components/RightSidebar";
import { getDisplayName, OnChainPost, getAvatar, getGlobalPostsCount, getGlobalPosts } from "@/lib/microThreadsClient";
import { getStats } from "@/lib/movementClient";
import { formatMovementAddress, octasToMove } from "@/lib/movement";
import AuthGuard from "@/components/AuthGuard";
import { extractHashtags } from "@/utils/textUtils";

export default function HashtagPage() {
    const router = useRouter();
    const { tag } = router.query;
    const { connected, account } = useWallet();
    const [posts, setPosts] = useState<OnChainPost[]>([]);
    const [globalPosts, setGlobalPosts] = useState<OnChainPost[]>([]);
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

            // Fetch latest 200 posts for search & stats
            const LIMIT = 200;
            // getGlobalPosts takes page index, not offset
            const allPosts = await getGlobalPosts(0, LIMIT);
            
            setGlobalPosts(allPosts);

            // Filter by hashtag
            const filteredPosts = allPosts.filter(post => {
                const hashtags = extractHashtags(post.content).map(t => t.toLowerCase());
                return tag && hashtags.includes((tag as string).toLowerCase());
            });

            // Sort by latest
            const sortedPosts = [...filteredPosts].sort((a, b) => b.timestamp - a.timestamp);
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
        if (tag) {
            fetchData();
        }
    }, [tag, connected]);

    return (
        <AuthGuard>
            <Head>
                <title>#{tag} - MoveX</title>
            </Head>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 xl:divide-x xl:divide-[var(--card-border)]">
                    
                    {/* Main Feed */}
                    <div className="min-w-0 lg:px-6 space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <Link href="/feed" className="p-2 rounded-full hover:bg-[var(--hover-bg)] text-[var(--text-secondary)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </Link>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">#{tag}</h1>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="bg-[var(--card-bg)] border-b border-[var(--card-border)] p-4 animate-pulse">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 bg-neutral-800 rounded-full"></div>
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-4 bg-neutral-800 rounded w-1/3"></div>
                                                <div className="h-3 bg-neutral-800 rounded w-1/4"></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <div className="h-4 bg-neutral-800 rounded w-full"></div>
                                            <div className="h-4 bg-neutral-800 rounded w-5/6"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : posts.length > 0 ? (
                            posts.map((post) => (
                                <PostCard 
                                    key={post.global_id !== undefined ? post.global_id : `${post.creator}-${post.id}`}
                                    post={{
                                        ...post,
                                        id: post.id.toString(),
                                        creatorAddress: post.creator,
                                        creatorHandle: profiles[post.creator]?.displayName || formatMovementAddress(post.creator),
                                        creatorAvatar: profiles[post.creator]?.avatar,
                                        totalTips: octasToMove(post.total_tips),
                                        createdAt: post.timestamp * 1000,
                                        updatedAt: post.updated_at * 1000,
                                    }}
                                    isOwner={post.creator === userAddress}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                                <p className="text-[var(--text-secondary)] mb-2">No posts found with #{tag}</p>
                            </div>
                        )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="hidden xl:block xl:pl-6">
                            <RightSidebar 
                                posts={globalPosts}
                                stats={stats}
                                currentUserAddress={userAddress}
                                profiles={profiles}
                            />
                        </div>
                    </div>
        </AuthGuard>
    );
}
