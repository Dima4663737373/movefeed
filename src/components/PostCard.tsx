/**
 * PostCard Component
 * 
 * Displays a single post with tipping functionality and image support
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { formatMovementAddress, octasToMove } from '@/lib/movement';
import { formatRelativeTime, formatPostTime, formatPostStatsDate } from '@/lib/utils';
import { getDisplayName, getAvatar, deletePostOnChain, editPostOnChain, getPost, getCommentsForPost, OnChainPost, createPostOnChain } from '@/lib/microThreadsClient';
import { saveLocalTransaction } from '@/lib/movementClient';
import { useMovementTransaction } from '@/hooks/useMovementTransaction';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useNotifications } from '@/components/Notifications';
import { supabase } from '@/lib/supabaseClient';
import { parseText } from '@/utils/textUtils';
import { CreatePostForm } from '@/components/CreatePostForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { v4 as uuidv4 } from 'uuid';

interface PostMedia {
    id: string;
    url: string;
    type: 'image' | 'video';
}

interface PostCardProps {
    post: {
        id: string;
        global_id?: number;
        creatorAddress: string;
        creatorHandle?: string;
        creatorAvatar?: string;
        content: string;
        image_url?: string;
        style: string | number;
        totalTips: number | string;
        createdAt: number;
        updatedAt?: number;
        commentCount?: number;
    };
    isOwner?: boolean;
    showTipButton?: boolean;
    initialIsBookmarked?: boolean;
    hideComments?: boolean;
    compact?: boolean;
}

export default function PostCard({ post, isOwner, showTipButton = true, initialIsBookmarked = false, hideComments = false, compact = false }: PostCardProps) {
    const router = useRouter();
    const { account, signAndSubmitTransaction, signMessage, network } = useWallet();
    const { sendTip } = useMovementTransaction();
    const { t } = useLanguage();
    const { currentNetwork } = useNetwork();
    const { addNotification } = useNotifications();
    const [displayName, setDisplayName] = useState<string>(post.creatorHandle || '');
    const [avatarUrl, setAvatarUrl] = useState<string>(post.creatorAvatar || '');
    const [tipping, setTipping] = useState(false);
    const [tipAmount, setTipAmount] = useState('1');
    const [showTipInput, setShowTipInput] = useState(false);
    const [votes, setVotes] = useState({ up: 0, down: 0 });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTip = localStorage.getItem('default_tip_amount');
            if (savedTip) {
                setTipAmount(savedTip);
            }
        }
    }, []);

    const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
    const [voting, setVoting] = useState(false);

    // Reply state
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [showRepostForm, setShowRepostForm] = useState(false);

    // Image viewer state
    const [isImageOpen, setIsImageOpen] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

    // Multi-media state
    const [media, setMedia] = useState<PostMedia[]>([]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    // Repost state
    const [repostedPost, setRepostedPost] = useState<OnChainPost | null>(null);
    const [isLoadingRepost, setIsLoadingRepost] = useState(false);
    const [showRepostOptions, setShowRepostOptions] = useState(false);
    const [isReposting, setIsReposting] = useState(false);
    
    // Copy link state
    const [isCopied, setIsCopied] = useState(false);

    const handleSimpleRepost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!account) return;
        setIsReposting(true);
        setShowRepostOptions(false);
        try {
            const postRef = uuidv4();
            
            // 1. Insert Metadata
            if (supabase) {
                await supabase.from('post_metadata').insert({
                    post_ref: postRef,
                    repost_of: post.global_id !== undefined ? post.global_id.toString() : post.id,
                    metadata: {}
                });
            }
            
            // 2. Create Post on Chain
            await createPostOnChain(
                `[ref:${postRef}]`, 
                '', 
                0, 
                signAndSubmitTransaction
            );
            
            addNotification(t.postCreatedSuccess, "success", { persist: false });
            window.dispatchEvent(new Event('tip_sent')); // Refresh feed
        } catch (error) {
            console.error("Repost failed", error);
            addNotification(t.postCreationError, "error", { persist: true });
        } finally {
            setIsReposting(false);
        }
    };
    
    // Bookmark state
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
    const [bookmarkCount, setBookmarkCount] = useState(0);
    const [bookmarking, setBookmarking] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    // Initialize editContent without the ref tag if it exists
    const [editContent, setEditContent] = useState(() => {
        return post.content.replace(/\[ref:[a-f0-9\-]+\]/g, '').trim();
    });
    const [editImage, setEditImage] = useState(post.image_url || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Comments state
    const [comments, setComments] = useState<OnChainPost[]>([]);
    const [commentCount, setCommentCount] = useState(post.commentCount || 0);
    const [loadingComments, setLoadingComments] = useState(false);
    
    // Local post state for optimistic updates
    const [localPost, setLocalPost] = useState(post);
    const [viewCount, setViewCount] = useState(0);

    useEffect(() => {
        setLocalPost(post);
    }, [post]);

    // Extract special features
    const bountyMatch = localPost.content.match(/\[bounty:([\d.]+)\]/);
    const bountyAmount = bountyMatch ? parseFloat(bountyMatch[1]) : null;

    const pollData = useMemo(() => {
        const match = localPost.content.match(/\[poll:(.*?)\]/);
        if (!match) return null;
        
        try {
            const raw = match[1];
            // Check if it's likely JSON (starts with {) - Legacy format support (might be broken if contained ])
            if (raw.trim().startsWith('{')) {
                return JSON.parse(raw);
            }
            
            // Assume Base64 (New format)
            if (typeof window !== 'undefined') {
                 return JSON.parse(decodeURIComponent(escape(window.atob(raw))));
            } else if (typeof Buffer !== 'undefined') {
                 return JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
            }
            return null;
        } catch (e) {
            // console.error("Failed to parse poll data", e);
            return null;
        }
    }, [localPost.content]);

    // Helper to format content with clickable links and hashtags
    const formatContentWithLinks = (text: string) => {
        if (!text) return null;
        
        // Strip ref tag, bounty tag, and poll tag
        const cleanText = text
            .replace(/\[ref:[a-f0-9\-]+\]/g, '')
            .replace(/\[bounty:[\d.]+\]/g, '')
            .replace(/\[poll:.*?\]/g, '')
            .trim();
            
        if (!cleanText) return null;

        const segments = parseText(cleanText);
        
        return segments.map((segment, index) => {
            if (segment.type === 'url') {
                return (
                    <a 
                        key={index}
                        href={segment.content} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[var(--accent)] hover:underline break-all relative z-10 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {segment.content}
                    </a>
                );
            } else if (segment.type === 'hashtag') {
                return (
                    <Link 
                        key={index}
                        href={`/hashtag/${segment.content}`}
                        className="text-[var(--accent)] hover:underline relative z-10 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        #{segment.content}
                    </Link>
                );
            } else {
                return <span key={index}>{segment.content}</span>;
            }
        });
    };

    // Fetch and increment views
    useEffect(() => {
        let mounted = true;

        const handleViews = async () => {
            try {
                // If detailed view (comments not hidden), increment view count
                // Use localStorage to prevent duplicate counts per browser (persistent)
                if (!hideComments) {
                    const viewedKey = `viewed_${post.id}`;
                    // Check localStorage first (more persistent than sessionStorage)
                    if (!localStorage.getItem(viewedKey)) {
                        await fetch('/api/views', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                postId: post.id,
                                viewerAddress: account?.address?.toString() 
                            })
                        });
                        localStorage.setItem(viewedKey, 'true');
                    }
                }

                // Fetch current view count
                const res = await fetch(`/api/views?postId=${post.id}`);
                if (res.ok && mounted) {
                    const data = await res.json();
                    setViewCount(data.viewCount);
                }
            } catch (e) {
                console.error("Error handling views:", e);
            }
        };

        handleViews();

        return () => { mounted = false; };
    }, [post.id, hideComments, account?.address]);

    useEffect(() => {
        const fetchMediaAndMetadata = async () => {
            const refMatch = post.content.match(/\[ref:([a-f0-9\-]+)\]/);
            if (refMatch && refMatch[1]) {
                const refId = refMatch[1];
                setIsLoadingMedia(true);
                if (supabase) {
                    // Fetch Media
                    const { data: mediaData } = await supabase
                        .from('post_media')
                        .select('*')
                        .eq('post_ref', refId);
                    
                    if (mediaData) {
                        setMedia(mediaData as PostMedia[]);
                    }

                    // Fetch Metadata (for Reposts)
                    const { data: metaData } = await supabase
                        .from('post_metadata')
                        .select('repost_of')
                        .eq('post_ref', refId)
                        .maybeSingle();
                    
                    if (metaData && metaData.repost_of) {
                        setIsLoadingRepost(true);
                        try {
                            const originalPost = await getPost(parseInt(metaData.repost_of));
                            setRepostedPost(originalPost);
                        } catch (e) {
                            console.error("Failed to fetch reposted post", e);
                        } finally {
                            setIsLoadingRepost(false);
                        }
                    }
                }
                setIsLoadingMedia(false);
            } else {
                setMedia([]);
                setRepostedPost(null);
            }
        };
        fetchMediaAndMetadata();
    }, [post.content]);
    
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Sync from props if available
                if (post.creatorHandle) {
                    setDisplayName(post.creatorHandle);
                } else {
                    // Fetch if not provided
                    const name = await getDisplayName(post.creatorAddress);
                    if (name) setDisplayName(name);
                }

                if (post.creatorAvatar) {
                    setAvatarUrl(post.creatorAvatar);
                } else {
                    const avatar = await getAvatar(post.creatorAddress);
                    if (avatar) setAvatarUrl(avatar);
                }
            } catch (e) {
                console.error("Error fetching profile", e);
            }
        };

        const fetchVotes = async () => {
            try {
                const queryParams = new URLSearchParams({
                    postId: post.id,
                    creatorAddress: post.creatorAddress
                });
                if (account?.address) {
                    queryParams.append('userAddress', account.address.toString());
                }

                const res = await fetch(`/api/votes?${queryParams.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setVotes({ up: data.up || 0, down: data.down || 0 });
                        setUserVote(data.userVote);
                    }
                }
            } catch (e) {
                console.error("Error fetching votes", e);
            }
        };

        fetchProfile();
        fetchVotes();
    }, [post.id, post.creatorAddress, post.creatorHandle, post.creatorAvatar, account?.address]);

    // Check bookmark status
    useEffect(() => {
        const checkBookmark = async () => {
            try {
                const postId = post.global_id !== undefined ? post.global_id : post.id;
                let url = `/api/bookmarks?postId=${postId}`;
                if (account?.address) {
                    url += `&userAddress=${account.address}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    if (data.bookmarked !== undefined) setIsBookmarked(data.bookmarked);
                    if (data.count !== undefined) setBookmarkCount(data.count);
                }
            } catch (e) {
                console.error("Error checking bookmark", e);
            }
        };
        checkBookmark();
    }, [post.id, post.global_id, account?.address, initialIsBookmarked]);

    // Fetch comment count if needed
    useEffect(() => {
        if (post.commentCount !== undefined) {
             setCommentCount(post.commentCount);
             return;
        }
        
        // If comments are already loaded, use that length
        if (comments.length > 0) {
            setCommentCount(comments.length);
            return;
        }

        // Only fetch if we are in feed view (comments hidden) and count is unknown
        if (hideComments) {
            const fetchCount = async () => {
                try {
                    const fetched = await getCommentsForPost(parseInt(post.id));
                    setCommentCount(fetched.length);
                } catch (e) {
                    // console.error("Error fetching comment count", e);
                }
            };
            fetchCount();
        }
    }, [post.id, post.commentCount, comments.length, hideComments]);

    // Fetch comments
    useEffect(() => {
        if (hideComments) return;
        
        const fetchComments = async () => {
            if (!post.id) return;
            try {
                setLoadingComments(true);
                // Don't fetch comments for comments (nested) to avoid infinite recursion if not needed
                // But user might want deep nesting. For now, let's allow it but limit display.
                const fetchedComments = await getCommentsForPost(parseInt(post.id));
                setComments(fetchedComments);
            } catch (e) {
                console.error("Error fetching comments", e);
            } finally {
                setLoadingComments(false);
            }
        };
        fetchComments();

        const handleCommentAdded = () => {
             // Refresh comments when a new one is added
             fetchComments();
        };
        window.addEventListener('comment_added', handleCommentAdded);
        return () => window.removeEventListener('comment_added', handleCommentAdded);
    }, [post.id]);

    const handleVote = async (e: React.MouseEvent, type: 'up' | 'down') => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log(`Voting: type=${type}, current=${userVote}, voting=${voting}`);
        
        if (!account) {
            alert(t.connectWallet);
            return;
        }
        
        // Optimistic update
        const previousUserVote = userVote;
        const previousVotes = { ...votes };
        
        let newUserVote: 'up' | 'down' | null = type;
        if (userVote === type) {
            newUserVote = null; // Toggle off
        }

        // Calculate new counts
        let newUp = votes.up;
        let newDown = votes.down;

        // Remove old vote
        if (userVote === 'up') newUp = Math.max(0, newUp - 1);
        if (userVote === 'down') newDown = Math.max(0, newDown - 1);

        // Add new vote
        if (newUserVote === 'up') newUp++;
        if (newUserVote === 'down') newDown++;

        // Apply optimistic state
        setUserVote(newUserVote);
        setVotes({ up: newUp, down: newDown });

        try {
            setVoting(true);
            
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: post.id,
                    creatorAddress: post.creatorAddress,
                    userAddress: account.address.toString(),
                    type: type
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Ensure server state sync
                setVotes({ up: data.up, down: data.down });
                setUserVote(data.userVote);
            } else {
                const errorData = await res.json().catch(() => ({ error: res.statusText }));
                console.error("Vote API error:", errorData);
                throw new Error(errorData.error || "Vote failed");
            }
        } catch (e) {
            console.error("Error voting", e);
            // Revert on error
            setUserVote(previousUserVote);
            setVotes(previousVotes);
            addNotification(t.voteError, "error", { persist: true });
        } finally {
            setVoting(false);
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!account) {
            alert(t.connectWallet);
            return;
        }

        const wasBookmarked = isBookmarked;
        const previousCount = bookmarkCount;

        try {
            setBookmarking(true);
            
            // Optimistic update
            setIsBookmarked(!wasBookmarked);
            setBookmarkCount(prev => wasBookmarked ? Math.max(0, prev - 1) : prev + 1);

            // Direct bookmark without signature (User Request: Remove popup)
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    postId: (post.global_id !== undefined ? post.global_id : post.id).toString(),
                    creatorAddress: post.creatorAddress,
                    userAddress: account.address.toString()
                })
            });

            if (res.ok) {
                const data = await res.json();
                setIsBookmarked(data.bookmarked);
                if (data.count !== undefined) setBookmarkCount(data.count);
                window.dispatchEvent(new Event('bookmark_changed'));
            } else {
                console.error("Bookmark failed", await res.text());
                addNotification("Failed to bookmark", "error", { persist: true });
                // Revert
                setIsBookmarked(wasBookmarked);
                setBookmarkCount(previousCount);
            }
        } catch (e) {
            console.error("Error bookmarking", e);
            addNotification("Error bookmarking", "error", { persist: true });
            // Revert
            setIsBookmarked(wasBookmarked);
            setBookmarkCount(previousCount);
        } finally {
            setBookmarking(false);
        }
    };

    const handleTip = async (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("Tip button clicked");

        if (!account) {
            console.log("No account connected");
            alert(t.connectWallet);
            return;
        }

        // Strict Network Check
        const requiredChainId = currentNetwork === 'testnet' ? '250' : '126';
        if (network?.chainId?.toString() !== requiredChainId) {
            console.error("Wrong network:", network?.chainId);
            alert(`Wrong network! Please switch your wallet to Movement ${currentNetwork === 'testnet' ? 'Testnet' : 'Mainnet'} (Chain ID: ${requiredChainId}). Currently on: ${network?.chainId || 'Unknown'}`);
            return;
        }

        console.log("Account connected:", account.address);
        console.log("SignAndSubmit defined:", !!signAndSubmitTransaction);

        try {
            setTipping(true);
            console.log("Preparing to send tip...");

            const params = {
                creatorAddress: post.creatorAddress,
                postId: parseInt(post.id),
                amount: parseFloat(tipAmount)
            };
            
            console.log("Tip params:", params);

            if (isNaN(params.postId)) {
                console.error("Invalid postId:", post.id);
                addNotification("Invalid Post ID", "error", { persist: false });
                return;
            }

            if (isNaN(params.amount) || params.amount <= 0) {
                console.error("Invalid amount:", tipAmount);
                addNotification("Invalid tip amount", "error", { persist: false });
                return;
            }

            console.log("Calling sendTip...");
            // Use smart contract for tipping
            const result = await sendTip(params.creatorAddress, params.amount, post.id);
            const txHash = result.hash;
            console.log("sendTip returned hash:", txHash);

            // Save to local storage for immediate UI update
            if (account?.address) {
                saveLocalTransaction({
                    sender: account.address.toString(),
                    receiver: post.creatorAddress,
                    amount: parseFloat(tipAmount),
                    timestamp: Math.floor(Date.now() / 1000), // Store in seconds to match on-chain events
                    hash: txHash,
                    postId: post.id.toString(),
                    type: 'sent'
                });
            }

            setShowTipInput(false);
            await new Promise(resolve => setTimeout(resolve, 3000));
            window.dispatchEvent(new Event('tip_sent'));
            addNotification(t.tipSuccess, "success", { persist: false });
        } catch (error) {
            console.error("Tip failed details:", error);
            addNotification(t.tipError + ": " + (error instanceof Error ? error.message : String(error)), "error", { persist: true });
        } finally {
            setTipping(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("Image selection triggered");
        const file = e.target.files?.[0];
        if (!file) return;

        console.log("File selected:", file.name, file.size);

        if (file.size > 10 * 1024 * 1024) {
            addNotification(t.imageTooLargeError, "info", { persist: false });
            e.target.value = ''; // Reset input
            return;
        }

        addNotification(t.processingImage, "info", { persist: false });

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const attempts = [
                    { maxSize: 1600, quality: 0.8 },
                    { maxSize: 1200, quality: 0.7 },
                    { maxSize: 1024, quality: 0.6 },
                    { maxSize: 800, quality: 0.6 },
                    { maxSize: 600, quality: 0.5 },
                    { maxSize: 400, quality: 0.5 },
                    { maxSize: 300, quality: 0.4 }, // Deep compression
                ];

                let success = false;
                for (const attempt of attempts) {
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > attempt.maxSize) {
                            height *= attempt.maxSize / width;
                            width = attempt.maxSize;
                        }
                    } else {
                        if (height > attempt.maxSize) {
                            width *= attempt.maxSize / height;
                            height = attempt.maxSize;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    if (ctx) {
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                    }
                    const compressedBase64 = canvas.toDataURL('image/jpeg', attempt.quality);
                    if (compressedBase64.length <= 50000) {
                        setEditImage(compressedBase64);
                        success = true;
                        console.log("Image compressed successfully");
                        break;
                    }
                }
                if (!success) {
                    addNotification(t.compressionError, "info", { persist: false });
                }
                e.target.value = ''; // Reset input after processing
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleEdit = async () => {
        if (!editContent.trim()) {
            alert(t.contentEmpty);
            return;
        }
        try {
            setIsSaving(true);
            
            // Preserve ref tag if it exists in the original post
            let finalContent = editContent;
            const refMatch = post.content.match(/\[ref:[a-f0-9\-]+\]/);
            if (refMatch) {
                finalContent = `${finalContent}\n${refMatch[0]}`;
            }

            await editPostOnChain(parseInt(post.id), finalContent, editImage, signAndSubmitTransaction);
            
            // Optimistic update
            setLocalPost(prev => ({
                ...prev,
                content: finalContent,
                image_url: editImage
            }));

            setIsEditing(false);
            addNotification(t.postUpdated, "success", { persist: false });
            setTimeout(() => window.dispatchEvent(new Event('tip_sent')), 3000);
        } catch (error) {
            console.error("Edit failed:", error);
            addNotification(t.postUpdateError, "error", { persist: true });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t.deleteConfirm)) return;
        try {
            setIsDeleting(true);
            await deletePostOnChain(parseInt(post.id), signAndSubmitTransaction);
            addNotification(t.postDeleted, "success", { persist: false });
            setTimeout(() => window.dispatchEvent(new Event('tip_sent')), 3000);
        } catch (error) {
            console.error("Delete failed:", error);
            addNotification(t.postDeleteError, "error", { persist: true });
            setIsDeleting(false);
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent navigation if text is selected
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        
        // Don't navigate if we're editing
        if (isEditing) return;

        router.push(`/${post.creatorAddress}/status/${post.id}`);
    };

    return (
        <>
            <div 
                className={`${compact ? 'py-2 hover:bg-transparent' : 'border-b border-[var(--card-border)] px-4 py-3 lg:px-6 lg:py-4 hover:bg-[var(--hover-bg)]'} transition-colors duration-200 cursor-pointer`}
                onClick={handleCardClick}
            >
                {/* Repost Indicator */}
                {repostedPost && !localPost.content.replace(/\[ref:[a-f0-9\-]+\]/g, '').trim() && (
                    <div className="flex items-center gap-2 mb-2 text-[var(--text-secondary)] text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="hover:underline cursor-pointer" onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${post.creatorAddress}`);
                        }}>
                            {displayName || formatMovementAddress(post.creatorAddress)}
                        </span> 
                        <span>reposted</span>
                    </div>
                )}

                {/* Header: Avatar, Name, Time, Menu */}
                <div className="flex gap-3">
                    {/* Avatar Column */}
                    <div className="flex-shrink-0">
                        <Link href={`/${post.creatorAddress}`} onClick={(e) => e.stopPropagation()}>
                            <div className="w-10 h-10 rounded-full bg-[var(--card-border)] overflow-hidden">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-[var(--text-primary)]">
                                        {displayName ? displayName[0].toUpperCase() : 'U'}
                                    </div>
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Content Column */}
                    <div className="flex-grow min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Link href={`/${post.creatorAddress}`} className="font-bold text-[var(--text-primary)] hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                    {displayName || formatMovementAddress(post.creatorAddress)}
                                </Link>
                                <span className="text-[var(--text-secondary)] text-sm truncate">
                                    @{post.creatorAddress.slice(0, 6)}...
                                </span>
                                <span className="text-[var(--text-secondary)] text-sm">·</span>
                                <span className="text-[var(--text-secondary)] text-sm whitespace-nowrap" title={new Date(post.createdAt).toLocaleString()}>
                                    {formatPostTime(post.createdAt, router.pathname.includes('/status/'))}
                                </span>
                                {post.updatedAt && post.updatedAt > post.createdAt + 1000 && (
                                    <span 
                                        className="text-[var(--text-secondary)] text-sm ml-1 whitespace-nowrap" 
                                        title={`Edited: ${new Date(post.updatedAt).toLocaleString()}`}
                                    >
                                        · Edited {formatPostTime(post.updatedAt, false)}
                                    </span>
                                )}
                                {bountyAmount && (
                                    <span 
                                        className="ml-2 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20 flex items-center gap-1 shrink-0"
                                        title={`Bounty: ${bountyAmount} MOVE`}
                                    >
                                        <span>🎯</span>
                                        {bountyAmount} MOVE
                                    </span>
                                )}
                            </div>

                            {/* Menu/Actions */}
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                {isOwner && (
                                    <div className="relative group">
                                        <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-full transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                            </svg>
                                        </button>
                                        <div className="absolute right-0 mt-2 w-32 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                            <button
                                                onClick={() => {
                                                    // Strip ref tag when entering edit mode
                                                    setEditContent(post.content.replace(/\[ref:[a-f0-9\-]+\]/g, '').trim());
                                                    setIsEditing(true);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--hover-bg)] first:rounded-t-lg"
                                            >
                                                {t.edit}
                                            </button>
                                            <button
                                                onClick={handleDelete}
                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--hover-bg)] last:rounded-b-lg"
                                            >
                                                {t.delete}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Post Content */}
                        {isEditing ? (
                            <div className="mt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                                    rows={3}
                                />
                                <div className="space-y-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageSelect}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log("Opening file dialog");
                                                fileInputRef.current?.click();
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-border)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors text-sm font-medium"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {editImage ? t.changeImage : t.addImage}
                                        </button>
                                        
                                        {editImage && (
                                            <button
                                                onClick={() => setEditImage('')}
                                                className="px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                                            >
                                                {t.remove}
                                            </button>
                                        )}
                                    </div>

                                    {editImage && (
                                        <div className="relative rounded-lg overflow-hidden border border-[var(--card-border)] w-fit max-w-full">
                                            <img src={editImage} alt="Preview" className="max-h-40 object-contain" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        onClick={handleEdit}
                                        disabled={isSaving}
                                        className="px-3 py-1.5 text-sm font-bold bg-[var(--accent)] text-[var(--btn-text-primary)] rounded-full hover:opacity-90 disabled:opacity-50"
                                    >
                                        {isSaving ? t.saving : t.save}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1">
                                <p className="text-[var(--text-primary)] text-base whitespace-pre-wrap leading-relaxed">
                                    {formatContentWithLinks(localPost.content.replace(/\[ref:[a-f0-9\-]+\]/g, '').trim())}
                                </p>
                                
                                {/* Repost Content */}
                                {repostedPost && (
                                    <div 
                                        className="mt-3 p-3 border border-[var(--card-border)] rounded-xl bg-[var(--hover-bg)] cursor-pointer hover:bg-[var(--card-border)] transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/${repostedPost.creator}/status/${repostedPost.id}`);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-6 h-6 rounded-full bg-[var(--card-border)] overflow-hidden">
                                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                                                    {repostedPost.creator[0].toUpperCase()}
                                                </div>
                                            </div>
                                            <span className="font-bold text-sm text-[var(--text-primary)]">
                                                @{repostedPost.creator.slice(0, 6)}...
                                            </span>
                                            <span className="text-[var(--text-secondary)] text-xs">
                                                · {formatPostTime(repostedPost.timestamp * 1000, false)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap line-clamp-3">
                                            {repostedPost.content.replace(/\[ref:[a-f0-9\-]+\]/g, '').trim()}
                                        </div>
                                        {repostedPost.image_url && (
                                            <div className="mt-2 rounded-lg overflow-hidden h-24 w-full">
                                                <img src={repostedPost.image_url} alt="Reposted content" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Media Grid */}
                                {media.length > 0 ? (
                                    <div className={`mt-3 grid gap-1 rounded-xl overflow-hidden border border-[var(--card-border)] ${
                                        media.length === 1 ? 'grid-cols-1' : 
                                        media.length === 2 ? 'grid-cols-2' : 
                                        'grid-cols-2'
                                    }`}>
                                        {media.map((item, index) => (
                                            <div 
                                                key={item.id}
                                                className={`relative cursor-pointer hover:opacity-95 transition-opacity ${
                                                    media.length === 3 && index === 0 ? 'row-span-2' : ''
                                                } ${
                                                    media.length > 4 && index === 3 ? 'opacity-50' : ''
                                                } ${media.length > 1 ? 'aspect-square' : 'h-[210px]'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMediaIndex(index);
                                                    setIsImageOpen(true);
                                                }}
                                            >
                                                {item.type === 'video' ? (
                                                    <video src={item.url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={item.url} alt="Post content" className="w-full h-full object-cover" />
                                                )}
                                                
                                                {/* Overlay for +N images if more than 4 */}
                                                {media.length > 4 && index === 3 && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold text-xl">
                                                        +{media.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        )).slice(0, 4)}
                                    </div>
                                ) : localPost.image_url ? (
                                    <div 
                                        className="mt-3 rounded-xl overflow-hidden border border-[var(--card-border)] cursor-pointer hover:opacity-95 transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMediaIndex(0);
                                            setIsImageOpen(true);
                                        }}
                                    >
                                        <img src={localPost.image_url} alt="Post content" className="w-full h-auto max-h-[210px] object-cover" />
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {/* Post Stats Footer */}
                        <div className="flex items-center gap-1 mt-3 text-[var(--text-secondary)] text-[15px] leading-5 border-b border-[var(--card-border)] pb-3" onClick={(e) => e.stopPropagation()}>
                            <span className="hover:underline cursor-pointer">{formatPostStatsDate(localPost.createdAt)}</span>
                            <span>·</span>
                            <span className="font-bold text-[var(--text-primary)]">{viewCount}</span>
                            <span>Views</span>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center justify-between mt-2 w-full max-w-[550px]" onClick={(e) => e.stopPropagation()}>
                            {/* Reply Button */}
                            <button 
                                onClick={() => setShowReplyForm(!showReplyForm)}
                                className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-sky-500 transition-colors"
                                title={t.replyButton}
                            >
                                <div className="p-2 rounded-full group-hover:bg-sky-500/10 transition-all group-hover:scale-110">
                                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                                    </svg>
                                </div>
                                {commentCount > 0 && (
                                    <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-sky-500">
                                        {commentCount}
                                    </span>
                                )}
                            </button>

                            {/* Repost Button */}
                            <div className="relative">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowRepostOptions(!showRepostOptions);
                                    }}
                                    className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-green-500 transition-colors"
                                    title={t.repostButton}
                                >
                                    <div className="p-2 rounded-full group-hover:bg-green-500/10 transition-all group-hover:scale-110">
                                        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                                        </svg>
                                    </div>
                                </button>
                                
                                {showRepostOptions && (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                                        <button 
                                            onClick={handleSimpleRepost}
                                            disabled={isReposting}
                                            className="w-full text-left px-4 py-3 hover:bg-[var(--hover-bg)] flex items-center gap-3 transition-colors text-[var(--text-primary)] font-medium text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                                            </svg>
                                            {isReposting ? "Reposting..." : t.repostButton}
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowRepostOptions(false);
                                                setShowRepostForm(true);
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-[var(--hover-bg)] flex items-center gap-3 transition-colors text-[var(--text-primary)] font-medium text-sm"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                            {t.quoteRepost || "Quote Repost"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Tip Button */}
                            <div className="flex items-center">
                                {isOwner ? (
                                    <div className="flex items-center gap-1 text-[var(--text-secondary)] opacity-50 cursor-not-allowed" title={t.cannotTipOwn}>
                                        <div className="p-2">
                                            <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                            </svg>
                                        </div>
                                        {(typeof post.totalTips === 'number' ? post.totalTips : parseFloat(post.totalTips as string)) > 0 && (
                                            <span className="text-xs font-medium">
                                                {typeof post.totalTips === 'number' 
                                                    ? post.totalTips.toFixed(1) 
                                                    : parseFloat(post.totalTips as string).toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                ) : showTipInput ? (
                                    <div className="flex items-center gap-2 animate-fadeIn bg-[var(--card-bg)] border border-[var(--accent)] rounded-full px-1 py-1">
                                        <input
                                            type="number"
                                            value={tipAmount}
                                            onChange={(e) => setTipAmount(e.target.value)}
                                            className="w-16 bg-transparent border-none px-2 py-1 text-sm font-bold text-[var(--text-primary)] focus:ring-0 focus:outline-none text-center appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            min="0.1"
                                            step="0.1"
                                            placeholder="0.0"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <button
                                            onClick={handleTip}
                                            disabled={tipping}
                                            className="px-3 py-1 bg-[var(--accent)] text-[var(--btn-text-primary)] text-xs font-bold rounded-full hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            {tipping ? '...' : t.tip}
                                        </button>
                                        <button
                                            onClick={() => setShowTipInput(false)}
                                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] rounded-full transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowTipInput(true)}
                                        className="group flex items-center gap-1 text-[var(--text-secondary)] hover:text-yellow-400 transition-colors"
                                        title={t.tip}
                                    >
                                        <div className="p-2 rounded-full group-hover:bg-yellow-400/10 transition-all group-hover:scale-110">
                                            <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                            </svg>
                                        </div>
                                        {(typeof post.totalTips === 'number' ? post.totalTips : parseFloat(post.totalTips as string)) > 0 && (
                                            <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-yellow-400">
                                                {typeof post.totalTips === 'number' 
                                                    ? post.totalTips.toFixed(1) 
                                                    : parseFloat(post.totalTips as string).toFixed(1)}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Vote Buttons (Compact Pill) */}
                            <div className="flex items-center bg-[var(--card-border)]/30 rounded-full h-9 border border-transparent hover:border-[var(--card-border)] transition-colors">
                                <button
                                    onClick={(e) => handleVote(e, 'up')}
                                    disabled={voting}
                                    className={`pl-2 pr-1.5 h-full flex items-center hover:text-green-500 transition-colors ${userVote === 'up' ? 'text-green-500' : 'text-[var(--text-secondary)]'}`}
                                >
                                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                    </svg>
                                </button>
                                <span className={`text-xs font-bold px-0.5 min-w-[12px] text-center ${votes.up > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                    {votes.up > 0 ? votes.up : ''}
                                </span>
                                <div className="w-[1px] h-4 bg-[var(--card-border)] mx-1"></div>
                                <button
                                    onClick={(e) => handleVote(e, 'down')}
                                    disabled={voting}
                                    className={`pl-1.5 pr-1.5 h-full flex items-center hover:text-red-500 transition-colors ${userVote === 'down' ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}
                                >
                                    <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>
                                <span className={`text-xs font-bold px-0.5 pr-2 min-w-[12px] text-center ${votes.down > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                                    {votes.down > 0 ? votes.down : ''}
                                </span>
                            </div>

                            {/* Bookmark Button */}
                            <button
                                onClick={handleBookmark}
                                disabled={bookmarking}
                                className={`group flex items-center gap-1 transition-colors ${isBookmarked ? 'text-blue-500' : 'text-[var(--text-secondary)] hover:text-blue-500'}`}
                                title={t.bookmark}
                            >
                                <div className="p-2 rounded-full group-hover:bg-blue-500/10 transition-all group-hover:scale-110">
                                    {isBookmarked ? (
                                        <svg className="w-[20px] h-[20px] fill-current" viewBox="0 0 24 24">
                                            <path d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                                        </svg>
                                    )}
                                </div>
                            </button>

                            {/* Share Button */}
                            <button 
                                className={`group flex items-center gap-1 transition-colors ${isCopied ? 'text-green-500' : 'text-[var(--text-secondary)] hover:text-blue-500'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const url = `${window.location.origin}/post/${post.id}`;
                                    navigator.clipboard.writeText(url).then(() => {
                                        setIsCopied(true);
                                        addNotification("Link copied", "success", { persist: false, duration: 1500 });
                                        setTimeout(() => setIsCopied(false), 2000);
                                    }).catch(() => {
                                        addNotification("Failed to copy", "error", { persist: false });
                                    });
                                }}
                                title="Copy link"
                            >
                                <div className={`p-2 rounded-full transition-colors ${isCopied ? 'bg-green-500/10' : 'group-hover:bg-blue-500/10'}`}>
                                    {isCopied ? (
                                        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-[20px] h-[20px]" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Comments Preview (Max 3) */}
                        {comments.length > 0 && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                {comments.slice(0, 3).map((comment) => (
                                    <div key={comment.id} className="relative mt-2">
                                        <div className="absolute left-[-32px] top-[-10px] bottom-0 w-[2px] bg-[var(--card-border)] rounded-full"></div>
                                        <PostCard
                                            post={{
                                                id: comment.id.toString(),
                                                creatorAddress: comment.creator,
                                                creatorHandle: undefined,
                                                creatorAvatar: undefined,
                                                content: comment.content,
                                                image_url: comment.image_url,
                                                style: comment.style,
                                                totalTips: octasToMove(comment.total_tips),
                                                createdAt: comment.timestamp * 1000,
                                                updatedAt: comment.updated_at,
                                                commentCount: 0 // We don't need to show comment count for previewed comments usually
                                            }}
                                            isOwner={account?.address?.toString() === comment.creator}
                                            hideComments={true}
                                            compact={true}
                                            showTipButton={true}
                                        />
                                    </div>
                                ))}
                                {comments.length > 3 && (
                                    <button 
                                        className="text-[13px] text-[var(--accent)] hover:underline w-full text-left mt-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/${post.creatorAddress}/status/${post.id}`);
                                        }}
                                    >
                                        {t.viewAllComments} ({comments.length})
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Inline Reply Form */}
                        {showReplyForm && (
                            <div className="mt-4 border-t border-[var(--card-border)] pt-4" onClick={(e) => e.stopPropagation()}>
                                <CreatePostForm 
                                    parentId={parseInt(post.id)} 
                                    onPostCreated={() => {
                                        setShowReplyForm(false);
                                        window.dispatchEvent(new Event('comment_added'));
                                        window.dispatchEvent(new Event('tip_sent')); // Trigger global refresh
                                    }} 
                                />
                            </div>
                        )}

                        {/* Inline Repost Form */}
                        {showRepostForm && (
                            <div className="mt-4 border-t border-[var(--card-border)] pt-4" onClick={(e) => e.stopPropagation()}>
                                <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-2">Repost this post</h3>
                                <CreatePostForm 
                                    repostOf={{
                                        id: parseInt(post.id),
                                        global_id: post.global_id,
                                        creator: post.creatorAddress,
                                        content: post.content,
                                        image_url: post.image_url || '',
                                        style: typeof post.style === 'string' ? parseInt(post.style) : post.style,
                                        total_tips: typeof post.totalTips === 'string' ? parseFloat(post.totalTips) : post.totalTips,
                                        timestamp: post.createdAt,
                                        is_deleted: false,
                                        updated_at: post.updatedAt || post.createdAt,
                                        last_tip_timestamp: 0,
                                        parent_id: 0,
                                        is_comment: false
                                    }}
                                    onPostCreated={() => {
                                        setShowRepostForm(false);
                                        window.dispatchEvent(new Event('post_created'));
                                    }} 
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {isImageOpen && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 cursor-zoom-out animate-fadeIn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsImageOpen(false);
                    }}
                >
                    <button 
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-[101]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsImageOpen(false);
                        }}
                    >
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    
                    {/* Previous Button */}
                    {media.length > 1 && (
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-[101]"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMediaIndex(prev => (prev - 1 + media.length) % media.length);
                            }}
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Next Button */}
                    {media.length > 1 && (
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-[101]"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMediaIndex(prev => (prev + 1) % media.length);
                            }}
                        >
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    <div 
                        className="relative max-w-full max-h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {media.length > 0 ? (
                            media[selectedMediaIndex].type === 'video' ? (
                                <video 
                                    src={media[selectedMediaIndex].url} 
                                    controls 
                                    autoPlay 
                                    className="max-w-screen max-h-screen object-contain rounded-sm shadow-2xl" 
                                />
                            ) : (
                                <img 
                                    src={media[selectedMediaIndex].url} 
                                    alt="Full size" 
                                    className="max-w-screen max-h-screen object-contain rounded-sm shadow-2xl"
                                />
                            )
                        ) : post.image_url ? (
                            <img 
                                src={post.image_url} 
                                alt="Full size" 
                                className="max-w-screen max-h-screen object-contain rounded-sm shadow-2xl"
                            />
                        ) : null}
                    </div>
                </div>
            )}
        </>
    );
}
