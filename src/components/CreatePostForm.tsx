/**
 * Create Post Form Component
 * 
 * Form for creating new posts on-chain with image support
 */

'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createPostOnChain, createCommentOnChain, OnChainPost } from '@/lib/microThreadsClient';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface CreatePostFormProps {
    onPostCreated?: (post?: OnChainPost) => void;
    parentId?: number;
    repostOf?: OnChainPost;
}

interface MediaItem {
    url: string;
    type: 'image' | 'video';
}

export function CreatePostForm({ onPostCreated, parentId, repostOf }: CreatePostFormProps) {
    const { t } = useLanguage();
    const { connected, signAndSubmitTransaction, account } = useWallet();
    const [content, setContent] = useState('');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFiles = (files: File[]) => {
        if (files.length === 0) return;

        // Limit to 4 items
        if (mediaItems.length + files.length > 4) {
            setError(t.mediaLimitError);
            return;
        }

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                // Allow larger initial files (up to 10MB) since we'll compress them
                if (file.size > 10 * 1024 * 1024) {
                    setError(t.imageTooLargeError);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Adaptive compression strategy
                        const attempts = [
                            { maxSize: 1600, quality: 0.8 },
                            { maxSize: 1200, quality: 0.7 },
                            { maxSize: 1024, quality: 0.6 },
                            { maxSize: 800, quality: 0.6 },
                            { maxSize: 600, quality: 0.5 },
                        ];

                        let success = false;

                        for (const attempt of attempts) {
                            let width = img.width;
                            let height = img.height;

                            // Resize logic
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

                            // Draw white background
                            if (ctx) {
                                ctx.fillStyle = '#FFFFFF';
                                ctx.fillRect(0, 0, width, height);
                                ctx.drawImage(img, 0, 0, width, height);
                            }

                            const compressedBase64 = canvas.toDataURL('image/jpeg', attempt.quality);

                            if (compressedBase64.length <= 100000) { // 100KB limit
                                setMediaItems(prev => [...prev, { url: compressedBase64, type: 'image' }]);
                                setError(null);
                                success = true;
                                break;
                            }
                        }
                        if (!success) {
                             const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                             setMediaItems(prev => [...prev, { url: compressedBase64, type: 'image' }]);
                        }
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                // Video handling
                if (file.size > 5 * 1024 * 1024) {
                    setError(t.videoTooLarge);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        setMediaItems(prev => [...prev, { 
                            url: event.target!.result as string, 
                            type: 'video' 
                        }]);
                        setError(null);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        processFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const files: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) files.push(file);
            }
        }
        if (files.length > 0) {
            e.preventDefault();
            processFiles(files);
        }
    };

    const removeMedia = (index: number) => {
        setMediaItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!connected) {
            setError(t.pleaseConnectWallet);
            return;
        }

        if (!content.trim() && mediaItems.length === 0 && !repostOf) {
            setError(t.enterContentOrMedia);
            return;
        }

        if (content.length > 1000) {
            setError(t.contentTooLong);
            return;
        }

        try {
            setCreating(true);

            let finalContent = content;
            let postRef = '';

            // Generate Ref if we have media OR repost
            if (mediaItems.length > 0 || repostOf) {
                postRef = uuidv4();
                finalContent += `\n[ref:${postRef}]`;
            }

            // Refactored logic:
            let uploadedMediaUrls: string[] = [];
            
            console.log("Starting media processing...");

            // Handle Media
            if (mediaItems.length > 0) {
                if (!supabase) {
                    console.warn("Supabase client not initialized. Skipping upload.");
                    // Check if any image is too large
                    const largeItem = mediaItems.find(i => i.url.startsWith('data:') && i.url.length > 50000);
                    if (largeItem) {
                         throw new Error("Image storage is not configured (missing Supabase credentials) and image is too large for on-chain storage.");
                    }
                } else {
                    const sb = supabase;
                    // Wait for all uploads to complete and return the new URLs
                    const processedItems = await Promise.all(mediaItems.map(async (item) => {
                        let mediaUrl = item.url;
                        
                        // If it's a base64 string (starts with data:), try to upload it
                        if (item.url.startsWith('data:')) {
                            console.log("Attempting to upload base64 image...");
                            try {
                                const fileName = `${postRef}/${uuidv4()}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
                                const contentType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
                                
                                // Upload via API to bypass RLS issues with anonymous client
                                const uploadRes = await fetch('/api/upload', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        fileName,
                                        fileData: item.url,
                                        contentType
                                    })
                                });

                                if (uploadRes.ok) {
                                    const result = await uploadRes.json();
                                    mediaUrl = result.publicUrl;
                                    console.log("Upload successful:", mediaUrl);
                                } else {
                                    console.warn("Upload failed via API, using base64 fallback");
                                    const err = await uploadRes.json();
                                    console.warn("API Error:", err);
                                }
                            } catch (e) {
                                console.error("Error processing media for upload", e);
                            }
                        }

                        // Safety check: if fallback to base64 happens, ensure it's not too large for on-chain
                        if (mediaUrl.startsWith('data:') && mediaUrl.length > 50000) {
                             console.error("Image too large for chain:", mediaUrl.length);
                             throw new Error("Image upload failed and file is too large for on-chain storage. Please try a smaller image or check your connection.");
                        }

                        return {
                            post_ref: postRef,
                            url: mediaUrl,
                            type: item.type
                        };
                    }));

                    uploadedMediaUrls = processedItems.map(i => i.url);

                    const { error: mediaError } = await sb
                        .from('post_media')
                        .insert(processedItems);
                    
                    if (mediaError) {
                        console.error("Error uploading media:", mediaError);
                    }
                }
            }

            // Insert Metadata if Repost
            if (repostOf && postRef) {
                 if (!supabase) {
                     console.warn("Supabase not initialized, cannot save repost metadata");
                 } else {
                    const { error: metaError } = await supabase
                        .from('post_metadata')
                        .insert({
                            post_ref: postRef,
                            repost_of: repostOf.global_id !== undefined ? repostOf.global_id.toString() : repostOf.id.toString(),
                            metadata: {} 
                        });
                    if (metaError) {
                        console.error("Error inserting repost metadata:", metaError);
                    } else {
                        console.log("Repost metadata saved:", postRef);
                    }
                 }
            }

            // Pass first image as legacy image_url if available
            // Use the uploaded URL if available, otherwise fallback to original (which might be base64)
            const legacyImage = uploadedMediaUrls.length > 0 && mediaItems[0].type === 'image' 
                ? uploadedMediaUrls[0] 
                : (mediaItems.length > 0 && mediaItems[0].type === 'image' ? mediaItems[0].url : '');

            console.log("Preparing transaction with legacyImage length:", legacyImage.length);

            // Client-side validation for image size
            if (legacyImage.length > 200000) { // Limit to 200KB safe margin (contract is 250KB)
                setError(t.imageTooLarge || "Image too large for on-chain storage. Please try a smaller image.");
                setCreating(false);
                return;
            }

            if (parentId) {
                console.log("Creating comment...");
                await createCommentOnChain(
                    parentId,
                    finalContent,
                    legacyImage,
                    signAndSubmitTransaction
                );
                
                if (onPostCreated) {
                    onPostCreated();
                }
            } else {
                console.log("Creating post...");
                const newPostId = await createPostOnChain(
                    finalContent,
                    legacyImage, 
                    0, 
                    signAndSubmitTransaction
                );
                
                if (account?.address && onPostCreated) {
                    const optimisticPost: OnChainPost = {
                        // Use global_id if available (it should be now), otherwise fallback to local ID logic
                        // If newPostId is the global_id, we put it in global_id field.
                        // We put newPostId in 'id' as well for compatibility, but note it might be global.
                        // Wait, 'id' in OnChainPost is usually user-local ID.
                        // But for global feed we need global_id.
                        // If createPostOnChain returns global_id, we should use it as global_id.
                        // And for 'id', we don't know the user-local ID unless we fetch or guess.
                        // But for the Feed, we care about global_id.
                        id: newPostId || Date.now(), 
                        global_id: newPostId || undefined,
                        creator: account.address.toString(),
                        content: finalContent,
                        image_url: legacyImage,
                        style: 0,
                        total_tips: 0,
                        timestamp: Math.floor(Date.now() / 1000),
                        is_deleted: false,
                        updated_at: Math.floor(Date.now() / 1000),
                        last_tip_timestamp: 0,
                        parent_id: 0,
                        is_comment: false
                    };
                    
                    onPostCreated(optimisticPost);
                }
            }

            console.log(`Post created!`);
            setContent('');
            setMediaItems([]);
            setSuccess(true);
        } catch (error: any) {
            console.error('Failed to create post:', error);
            
            // Handle wallet rejection specifically
            if (error?.message?.includes("User has rejected") || error?.toString().includes("User has rejected")) {
                setError("Transaction rejected. Please ensure you approved the request in your wallet.");
            } else if (error?.message?.includes("module_not_found") || error?.toString().includes("module_not_found")) {
                setError("Module not found. Please switch your wallet to Movement Testnet (Bardock).");
            } else {
                setError(error instanceof Error ? error.message : t.postCreationError);
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4 mb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                {parentId ? t.leaveComment : repostOf ? t.quoteRepost : t.createPostTitle}
            </h2>

            {/* Repost Preview */}
            {repostOf && (
                <div className="mb-4 p-3 border border-[var(--card-border)] rounded-xl bg-[var(--hover-bg)] opacity-80">
                    <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-secondary)]">
                        <span className="font-bold">Reposting @{repostOf.creator.slice(0, 6)}...</span>
                    </div>
                    <div className="text-sm text-[var(--text-primary)] line-clamp-3">
                        {repostOf.content.replace(/\[ref:[a-f0-9\-]+\]/g, '')}
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {creating && (
                <div className="absolute inset-0 bg-black/50 z-50 rounded-xl flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-2" />
                    <span className="text-white font-medium">
                        {mediaItems.length > 0 ? "Uploading media & preparing..." : "Waiting for wallet..."}
                    </span>
                </div>
            )}

            {/* Success message */}
            {success && (
                <div className="mb-4 p-3 bg-green-400/10 border border-green-400/30 rounded-lg text-green-400 text-sm">
                    ✓ {t.postCreatedSuccess}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="mb-4 p-3 bg-red-400/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="mb-4">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={parentId ? t.writeReply : t.whatsHappeningPlaceholder}
                    className="w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-primary)] placeholder-neutral-500 focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                    rows={3}
                    maxLength={1000}
                    disabled={creating}
                />

                {/* Media Preview */}
            {mediaItems.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {mediaItems.map((item, index) => (
                        <div key={index} className="relative group aspect-video">
                            {item.type === 'video' ? (
                                <video src={item.url} className="h-32 w-full rounded-xl border border-[var(--card-border)] object-cover" />
                            ) : (
                                <img src={item.url} alt={`Preview ${index}`} className="h-32 w-full rounded-xl border border-[var(--card-border)] object-cover" />
                            )}
                            <button
                                type="button"
                                onClick={() => removeMedia(index)}
                                className="absolute -top-2 -right-2 bg-red-500 text-[var(--text-primary)] rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                            {item.type === 'video' && (
                                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                                    Video
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleMediaSelect}
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.accept = "image/*";
                                fileInputRef.current.click();
                            }
                        }}
                        className="text-neutral-400 hover:text-[var(--accent)] transition-colors flex items-center gap-2 text-sm font-medium"
                        disabled={creating || mediaItems.length >= 4}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {t.photo}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (fileInputRef.current) {
                                fileInputRef.current.accept = "video/*";
                                fileInputRef.current.click();
                            }
                        }}
                        className="text-neutral-400 hover:text-[var(--accent)] transition-colors flex items-center gap-2 text-sm font-medium"
                        disabled={creating || mediaItems.length >= 4}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        {t.video}
                    </button>
                    <span className="text-xs text-neutral-500">
                        {mediaItems.length}/4
                    </span>
                </div>
                    <div className="text-xs text-neutral-500">
                        {content.length}/1000
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={!connected || creating || (!content.trim() && mediaItems.length === 0 && !repostOf)}
                    className="px-6 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--btn-text-primary)] font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    {creating ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t.posting}
                        </span>
                    ) : (
                        parentId ? t.replyButton : repostOf ? t.repostButton : t.postButton
                    )}
                </button>
            </div>
        </form>
    );
}
