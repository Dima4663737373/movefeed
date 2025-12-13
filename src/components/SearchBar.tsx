/**
 * SearchBar Component
 * 
 * Allows searching for users and posts
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { OnChainPost } from '@/lib/microThreadsClient';
import { formatMovementAddress } from '@/lib/movement';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchBarProps {
    posts: OnChainPost[];
    profiles: Record<string, { displayName?: string; avatar?: string }>;
}

export function SearchBar({ posts, profiles }: SearchBarProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{
        users: Array<{ address: string; displayName?: string; avatar?: string }>;
        posts: Array<OnChainPost>;
    }>({ users: [], posts: [] });
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle search logic
    useEffect(() => {
        if (!query.trim()) {
            setResults({ users: [], posts: [] });
            return;
        }

        const lowerQuery = query.toLowerCase();

        // 1. Search Users
        // Get unique creators from posts
        const uniqueCreators = Array.from(new Set(posts.map(p => p.creator)));
        
        const matchedUsers = uniqueCreators
            .map(address => ({
                address,
                ...profiles[address]
            }))
            .filter(user => {
                const nameMatch = user.displayName?.toLowerCase().includes(lowerQuery);
                const addressMatch = user.address.toLowerCase().includes(lowerQuery);
                return nameMatch || addressMatch;
            })
            .slice(0, 5); // Limit to 5 users

        // 2. Search Posts
        const matchedPosts = posts
            .filter(post => post.content.toLowerCase().includes(lowerQuery))
            .slice(0, 5); // Limit to 5 posts

        setResults({ users: matchedUsers, posts: matchedPosts });
        setIsOpen(true);
    }, [query, posts, profiles]);

    return (
        <div ref={wrapperRef} className="relative w-full mb-6">
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 rounded-full bg-[var(--hover-bg)] border-none text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--accent)] focus:bg-[var(--card-bg)] transition-all outline-none"
                    placeholder={t.searchPlaceholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (query.trim()) setIsOpen(true);
                    }}
                />
            </div>

            {/* Dropdown Results */}
            {isOpen && (results.users.length > 0 || results.posts.length > 0) && (
                <div className="absolute z-50 w-full mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl overflow-hidden max-h-[80vh] overflow-y-auto">
                    
                    {/* Users Section */}
                    {results.users.length > 0 && (
                        <div className="py-2">
                            <h3 className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.people}</h3>
                            {results.users.map(user => (
                                <button
                                    key={user.address}
                                    onClick={() => {
                                        router.push(`/u/${user.address}`);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-[var(--text-primary)]">
                                                {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-[var(--text-primary)] truncate">
                                            {user.displayName || formatMovementAddress(user.address)}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)] truncate">
                                            @{user.address}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {results.users.length > 0 && results.posts.length > 0 && (
                        <div className="border-t border-[var(--card-border)]" />
                    )}

                    {/* Posts Section */}
                    {results.posts.length > 0 && (
                        <div className="py-2">
                            <h3 className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t.posts}</h3>
                            {results.posts.map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => {
                                        router.push(`/post/${post.id}`);
                                        setIsOpen(false);
                                        setQuery('');
                                    }}
                                    className="w-full px-4 py-3 hover:bg-[var(--hover-bg)] transition-colors text-left"
                                >
                                    <p className="text-sm text-[var(--text-primary)] line-clamp-2 mb-1">
                                        {post.content}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                        <span>
                                            {profiles[post.creator]?.displayName || formatMovementAddress(post.creator)}
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(post.timestamp * 1000).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {isOpen && query.trim() && results.users.length === 0 && results.posts.length === 0 && (
                <div className="absolute z-50 w-full mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl p-8 text-center">
                    <p className="text-[var(--text-secondary)]">{t.noResults} "{query}"</p>
                </div>
            )}
        </div>
    );
}
