/**
 * Bookmarks Page
 * 
 * Saved posts and bookmarks (Coming Soon)
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import AuthGuard from "@/components/AuthGuard";
import LeftSidebar from "@/components/LeftSidebar";
import { getDisplayName, getAvatar, getPost } from "@/lib/microThreadsClient";
import PostCard from "@/components/PostCard";
import { octasToMove } from "@/lib/movement";

export default function BookmarksPage() {
    const { account, connected } = useWallet();
    const userAddress = account?.address.toString() || "";
    const [myDisplayName, setMyDisplayName] = useState("");
    const [myAvatar, setMyAvatar] = useState("");
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, any>>({});

    useEffect(() => {
        const fetchProfile = async () => {
            if (connected && userAddress) {
                try {
                    const name = await getDisplayName(userAddress);
                    const avatar = await getAvatar(userAddress);
                    setMyDisplayName(name);
                    setMyAvatar(avatar);
                } catch (err) {
                    console.error('Failed to load profile', err);
                }
            }
        };
        fetchProfile();
    }, [connected, userAddress]);

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!connected || !userAddress) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // Fetch bookmarks
                    const res = await fetch(`/api/bookmarks?userAddress=${userAddress}`);
                    if (res.ok) {
                        const data = await res.json();
                        setBookmarks(data.bookmarks || []);

                        // Extract post IDs from bookmarks (key format: "creatorAddress_postId")
                        const bookmarkIds = data.bookmarks.map((b: any) => {
                            const parts = b.key.split('_');
                            // The ID is the last part
                            const idStr = parts[parts.length - 1];
                            return parseInt(idStr);
                        }).filter((id: number) => !isNaN(id));

                        // Fetch specific posts in parallel
                        // We use getPost which is now O(1) on chain
                        const postPromises = bookmarkIds.map((id: number) => getPost(id));
                        const fetchedPosts = await Promise.all(postPromises);
                        
                        // Filter nulls and sort by timestamp desc
                        const validPosts = fetchedPosts
                            .filter((p): p is any => p !== null)
                            .sort((a, b) => b.timestamp - a.timestamp);

                        setPosts(validPosts);

                        // Note: Comment counts are expensive to calculate without an index, 
                        // so we skip them for bookmarks page for now to ensure scalability.
                        setCommentCounts({});

                        // Load profiles
                        const uniqueCreators = [...new Set(validPosts.map(p => p.creator))];
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
                }
            } catch (error) {
                console.error("Error fetching bookmarks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookmarks();

        // Listen for bookmark changes
        const handleBookmarkChange = () => {
            fetchBookmarks();
        };
        window.addEventListener('bookmark_changed', handleBookmarkChange);
        window.addEventListener('comment_added', handleBookmarkChange);
        
        return () => {
            window.removeEventListener('bookmark_changed', handleBookmarkChange);
            window.removeEventListener('comment_added', handleBookmarkChange);
        };
    }, [connected, userAddress]);

    return (
        <AuthGuard>
            <Head>
                <title>Bookmarks - MoveFeed</title>
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
                            <LeftSidebar activePage="bookmarks" currentUserAddress={userAddress} displayName={myDisplayName} avatar={myAvatar} />
                        </div>

                        {/* CENTER: Bookmarks */}
                        <div className="lg:px-6 min-w-0">
                            <div className="flex items-center justify-between mb-4 px-4 lg:px-0">
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">Bookmarks</h2>
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
                                            key={`${post.creator}_${post.id}`}
                                            post={{
                                                id: post.id.toString(),
                                                global_id: post.global_id,
                                                creatorAddress: post.creator,
                                                creatorHandle: profiles[post.creator]?.displayName,
                                                creatorAvatar: profiles[post.creator]?.avatar,
                                                content: post.content,
                                                image_url: post.image_url,
                                                style: post.style,
                                                totalTips: octasToMove(post.total_tips),
                                                createdAt: post.timestamp * 1000,
                                                commentCount: commentCounts[post.id] || 0
                                            }}
                                            isOwner={post.creator === userAddress}
                                            initialIsBookmarked={true}
                                            hideComments={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-12 text-center min-h-[500px] flex flex-col items-center justify-center">
                                    <div className="w-24 h-24 bg-[var(--accent)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-12 h-12 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </div>
                                    <h1 className="text-3xl font-bold mb-3 text-[var(--text-primary)]">No Bookmarks Yet</h1>
                                    <p className="text-xl text-[var(--text-secondary)] mb-8">Start saving posts you love!</p>
                                    <p className="text-[var(--text-secondary)] max-w-md">
                                        Click the bookmark icon on any post to save it here for later.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDEBAR (Empty placeholder to maintain layout width) */}
                        <div className="hidden xl:block xl:pl-6">
                        </div>
                    </div>
                </div>
            </main>
        </AuthGuard>
    );
}
