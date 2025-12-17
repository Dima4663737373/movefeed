import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import Head from 'next/head';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import PostCard from '@/components/PostCard';
import CommentSection from '@/components/CommentSection';
import { getPost, getCommentsForPost, getDisplayName, getAvatar, OnChainPost } from '@/lib/microThreadsClient';
import { octasToMove } from '@/lib/movement';
import { WalletConnectButton } from '@/components/WalletConnectButton';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SinglePostPage() {
    const router = useRouter();
    const { id } = router.query;
    const { account, connected } = useWallet();
    const { t } = useLanguage();
    const userAddress = account?.address.toString() || "";

    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<OnChainPost[]>([]);
    const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    const [stats, setStats] = useState({ totalTips: 0, totalVolume: 0, topTipper: "None" });
    const [myDisplayName, setMyDisplayName] = useState("");
    const [myAvatar, setMyAvatar] = useState("");

    const fetchPostAndComments = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const postId = Number(id);
            
            // Use optimized getPost and getCommentsForPost
            const [fetchedPost, postComments] = await Promise.all([
                getPost(postId),
                getCommentsForPost(postId)
            ]);

            if (fetchedPost) {
                // Fetch creator profile
                const name = await getDisplayName(fetchedPost.creator);
                const avatar = await getAvatar(fetchedPost.creator);

                setPost({
                    ...fetchedPost,
                    creatorHandle: name,
                    creatorAvatar: avatar
                });

                // Calculate comment counts
                const counts: Record<number, number> = {};
                counts[postId] = postComments.length;
                setCommentCounts(counts);

                setComments(postComments);

                // Fetch profiles for comments
                const uniqueCreators = [...new Set(postComments.map(p => p.creator))];
                const profileMap: Record<string, any> = {};
                await Promise.all(uniqueCreators.map(async (creator) => {
                    const cName = await getDisplayName(creator);
                    const cAvatar = await getAvatar(creator);
                    profileMap[creator] = { displayName: cName, avatar: cAvatar };
                }));
                setProfiles(profileMap);
            }
        } catch (error) {
            console.error("Error fetching post:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPostAndComments();
        }
    }, [id]);

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

    return (
        <>
            <Head>
                <title>Post | MoveFeed</title>
            </Head>

            {/* Header - Movement Labs Style */}
            <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] sticky top-0 z-40 transition-colors duration-300">
                <div className="container-custom py-6">
                    <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(connected ? '/feed' : '/')}>
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
                            <LeftSidebar
                                activePage="home"
                                currentUserAddress={userAddress}
                                displayName={myDisplayName}
                                avatar={myAvatar}
                            />
                        </div>

                        {/* CENTER: Post & Comments */}
                        <div className="min-w-0 lg:px-6">
                            {/* Header with Back Button */}
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-[var(--hover-bg)] transition-colors">
                                    <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">{t.post}</h2>
                            </div>

                            {loading ? (
                                <div className="p-8 flex justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
                                </div>
                            ) : post ? (
                                <>
                                    <div className="border-b border-[var(--card-border)]">
                                        <PostCard
                                            post={{
                                                id: post.id.toString(),
                                                creatorAddress: post.creator,
                                                creatorHandle: post.creatorHandle,
                                                creatorAvatar: post.creatorAvatar,
                                                content: post.content,
                                                image_url: post.image_url,
                                                style: post.style,
                                                totalTips: octasToMove(post.total_tips),
                                                createdAt: post.timestamp * 1000,
                                                updatedAt: post.updated_at,
                                                commentCount: commentCounts[post.id] || 0
                                            }}
                                            isOwner={post.creator === userAddress}
                                        />
                                    </div>
                                    <CommentSection
                                        postId={post.id}
                                        comments={comments}
                                        commentCounts={commentCounts}
                                        onCommentAdded={fetchPostAndComments}
                                    />
                                </>
                            ) : (
                                <div className="p-8 text-center text-[var(--text-secondary)] bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)]">
                                    <p className="text-lg">{t.postNotFound}</p>
                                    <button 
                                        onClick={() => router.push(connected ? '/feed' : '/')}
                                        className="mt-4 text-[var(--accent)] hover:underline"
                                    >
                                        {t.returnToFeed}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="hidden xl:block xl:pl-6">
                            <RightSidebar
                                posts={[]} // Pass empty or fetch trending
                                stats={stats}
                                currentUserAddress={userAddress}
                                profiles={profiles}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
