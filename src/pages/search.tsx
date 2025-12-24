
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import PostCard from '@/components/PostCard';
import RightSidebar from '@/components/RightSidebar';
import { getDisplayName, OnChainPost, getAvatar, getGlobalPosts, getUserPostsPaginated } from '@/lib/microThreadsClient';
import { octasToMove } from '@/lib/movement';
import AuthGuard from '@/components/AuthGuard';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SearchPage() {
    const router = useRouter();
    const { q } = router.query;
    const { connected, account } = useWallet();
    const { t } = useLanguage();
    
    const [posts, setPosts] = useState<OnChainPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<Record<string, any>>({});
    
    const userAddress = account?.address.toString() || "";
    const query = (q as string) || "";

    useEffect(() => {
        if (!query) return;

        const fetchResults = async () => {
            setLoading(true);
            setPosts([]);
            
            try {
                let fetchedPosts: OnChainPost[] = [];
                let searchTerm = query.toLowerCase();
                let targetUser = "";

                // Parse "from:username"
                if (searchTerm.includes('from:')) {
                    const match = searchTerm.match(/from:(\S+)/);
                    if (match) {
                        targetUser = match[1];
                        searchTerm = searchTerm.replace(`from:${targetUser}`, '').trim();
                    }
                }

                if (targetUser) {
                    // Fetch user specific posts
                    // We need to resolve address if it's a name, but for now assume address or handle logic handled by caller
                    // If the caller passes a handle/name, we might need to resolve it.
                    // However, our profile page uses address in URL. 
                    // Let's assume targetUser IS the address for now as per our routing logic.
                    // If it's a name, we'd need a lookup.
                    
                    // Note: In [handle]/index.tsx we will pass the address.
                    try {
                         // Fetch last 50 posts from user
                         fetchedPosts = await getUserPostsPaginated(targetUser, 0, 50);
                    } catch (e) {
                        console.error("Failed to fetch user posts for search", e);
                    }
                } else {
                    // Global search
                    // Fetch recent global posts (e.g. 100)
                    fetchedPosts = await getGlobalPosts(0, 100);
                }

                // Filter in memory
                const filtered = fetchedPosts.filter(p => {
                    const contentMatch = p.content.toLowerCase().includes(searchTerm);
                    return contentMatch;
                });

                setPosts(filtered);

                // Load profiles
                const uniqueCreators = [...new Set(filtered.map(p => p.creator))];
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

            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

    // Handle Search Input in Header
    const [headerSearch, setHeaderSearch] = useState(query);
    useEffect(() => setHeaderSearch(query), [query]);

    const handleHeaderSearch = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            router.push(`/search?q=${encodeURIComponent(headerSearch)}`);
        }
    };

    return (
        <AuthGuard>
            <Head>
                <title>Search: {query} - MoveFeed</title>
            </Head>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6 xl:divide-x xl:divide-[var(--card-border)]">
                        
                        {/* CENTER: Results */}
                        <div className="min-w-0 lg:px-6">
                            {/* Search Bar */}
                            <div className="mb-6 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    value={headerSearch}
                                    onChange={(e) => setHeaderSearch(e.target.value)}
                                    onKeyDown={handleHeaderSearch}
                                    className="block w-full pl-10 pr-3 py-2 rounded-full bg-[var(--hover-bg)] border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--card-bg)] transition-all outline-none"
                                    placeholder="Search..."
                                />
                            </div>
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                    Search results for "{query.replace(/from:\S+/, '').trim() || query}"
                                </h1>
                            </div>

                            {loading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-[var(--card-bg)] border border-[var(--card-border)] p-4 rounded-xl animate-pulse h-40"></div>
                                    ))}
                                </div>
                            ) : posts.length > 0 ? (
                                <div className="space-y-4">
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
                                            highlight={query.replace(/from:\S+/, '').trim()}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center border border-[var(--card-border)] rounded-xl">
                                    <p className="text-[var(--text-secondary)]">No results found.</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT SIDEBAR */}
                        <div className="hidden xl:block xl:pl-6">
                            <RightSidebar 
                                currentUserAddress={userAddress}
                                posts={posts}
                                profiles={profiles}
                                stats={{
                                    totalTips: 0,
                                    totalVolume: 0,
                                    topTipper: "None"
                                }}
                            />
                        </div>
                    </div>
        </AuthGuard>
    );
}
