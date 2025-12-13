/**
 * MicroThreads Client
 * 
 * Client functions for interacting with the MoveFeed smart contract
 */

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { MOVEMENT_TESTNET_RPC, TIPJAR_MODULE_ADDRESS } from "./movement";

export interface OnChainPost {
    id: number;
    global_id?: number;
    creator: string;
    content: string;
    image_url?: string;
    style: number;
    total_tips: number;
    timestamp: number;
    is_deleted: boolean;
    updated_at: number;
    last_tip_timestamp: number;
    parent_id: number;
    is_comment: boolean;
}

const config = new AptosConfig({
    fullnode: MOVEMENT_TESTNET_RPC,
});
const aptos = new Aptos(config);

// Use the deployed contract address
const MODULE_ADDRESS = TIPJAR_MODULE_ADDRESS;
const MODULE_NAME = "MoveFeedV3";

// Log the configured address for debugging
if (typeof window !== 'undefined') {
    console.log(`[MicroThreads] Using Contract Address: ${MODULE_ADDRESS}`);
}

// Helper to safely extract string from Move String or raw string
const getString = (val: any): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && val.vec) {
        // Handle hex encoded strings if necessary, but usually it's just the string
        // If it's a byte array, we might need to decode it, but standard String is usually utf8
        return val.vec[0] || "";
    }
    return "";
};

/**
 * Initialize the global posts registry (Admin only)
 */
export async function initializeGlobalFeed(
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<boolean> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::initialize`,
            functionArguments: [],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });
        return true;
    } catch (error) {
        console.error("Error initializing global feed:", error);
        return false;
    }
}

/**
 * Create a new post on-chain
 */
export async function createPostOnChain(
    content: string,
    imageUrl: string,
    style: number,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<number | null> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_post`,
            functionArguments: [content, imageUrl, style],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        const result = await aptos.waitForTransaction({ transactionHash: response.hash }) as any;

        // Dispatch event for UI refresh
        window.dispatchEvent(new Event('tip_sent'));

        // Try to find post_id in events
        if (result.events) {
            for (const event of result.events) {
                // Look for PostCreated event
                if (event.type.includes("PostCreatedEvent") || event.type.includes("create_post")) {
                    // Try to get global post_id first, then fallback to id
                    if (event.data.post_id !== undefined) return Number(event.data.post_id);
                    if (event.data.id !== undefined) return Number(event.data.id);
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error("Error creating post:", error);
        throw error;
    }
}

/**
 * Create a new comment on-chain
 */
export async function createCommentOnChain(
    parentId: number,
    content: string,
    imageUrl: string,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<void> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::create_comment`,
            functionArguments: [parentId.toString(), content, imageUrl],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });

        // Dispatch event for UI refresh
        window.dispatchEvent(new Event('comment_added'));
    } catch (error) {
        console.error("Error creating comment:", error);
        throw error;
    }
}

/**
 * Delete a post on-chain
 */
export async function deletePostOnChain(
    postId: number,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<void> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::delete_post`,
            functionArguments: [postId.toString()],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
        console.error("Error deleting post:", error);
        throw error;
    }
}

/**
 * Edit a post on-chain (with image support)
 */
export async function editPostOnChain(
    postId: number,
    content: string,
    imageUrl: string,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<void> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::edit_post_with_image`,
            functionArguments: [postId.toString(), content, imageUrl],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
        console.error("Error editing post:", error);
        throw error;
    }
}


/**
 * Get a single post by global ID
 */
export async function getPost(postId: number): Promise<OnChainPost | null> {
    try {
        // Try to fetch specific post directly using our new function
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_post_by_id` as `${string}::${string}::${string}`,
            functionArguments: [postId.toString()], // Ensure string for u64
        };

        const result = await aptos.view({ payload });
        console.log(`getPost(${postId}) raw result:`, result);

        // Handle different return types
        let post: any = null;

        // Case 1: Returns vector<Post> (array)
        if (Array.isArray(result[0])) {
            const arr = result[0] as any[];
            if (arr.length > 0) post = arr[0];
        } 
        // Case 2: Returns Post (object) directly
        else if (result[0] && typeof result[0] === 'object') {
            post = result[0];
        }

        if (post) {
            return {
                id: Number(post.id),
                global_id: post.global_id !== undefined ? Number(post.global_id) : undefined,
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching post ${postId}:`, error);
        return null;
    }
}

/**
 * Get comments for a specific post
 */
export async function getCommentsForPost(parentId: number): Promise<OnChainPost[]> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_comments_for_post` as `${string}::${string}::${string}`,
            functionArguments: [parentId.toString()], // Ensure string for u64
        };

        const result = await aptos.view({ payload });
        const posts = result[0] as any[];

        return posts
            .map((post: any) => ({
                id: Number(post.id),
                global_id: post.global_id !== undefined ? Number(post.global_id) : undefined,
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            }))
            .filter((post: OnChainPost) => !post.is_deleted)
            .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return [];
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0 && error?.status === 429) {
            console.warn(`Rate limited, retrying in ${delay}ms...`);
            await sleep(delay);
            return retry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

/**
 * Get all posts from all users (paginated)
 */
export async function getAllPostsPaginated(start: number, limit: number): Promise<OnChainPost[]> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_all_posts_paginated` as `${string}::${string}::${string}`,
            functionArguments: [start, limit],
        };

        const result = await retry(() => aptos.view({ payload }));
        const posts = result[0] as any[];

        return posts
            .map((post: any) => ({
                id: Number(post.id),
                global_id: post.global_id !== undefined ? Number(post.global_id) : undefined,
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            }))
            .filter((post: OnChainPost) => !post.is_deleted)
            // Note: Caller is responsible for sorting if needed, but these come back in ID order
            // .sort((a, b) => b.timestamp - a.timestamp); 
    } catch (error) {
        console.error("Error fetching all posts paginated:", error);
        return [];
    }
}

/**
 * Get posts by a specific user (paginated)
 */
export async function getUserPostsPaginated(userAddress: string, start: number, limit: number): Promise<OnChainPost[]> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_posts_paginated` as `${string}::${string}::${string}`,
            functionArguments: [userAddress, start, limit],
        };

        const result = await aptos.view({ payload });
        const posts = result[0] as any[];

        return posts
            .map((post: any) => ({
                id: Number(post.id),
                global_id: post.global_id !== undefined ? Number(post.global_id) : undefined,
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            }))
            .filter((post: OnChainPost) => !post.is_deleted);
    } catch (error) {
        console.error("Error fetching user posts paginated:", error);
        return [];
    }
}

/**
 * Get all posts from all users
 * @deprecated Use getAllPostsPaginated instead for scalability
 */
export async function getAllPosts(): Promise<OnChainPost[]> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_all_posts` as `${string}::${string}::${string}`,
            functionArguments: [],
        };

        const result = await aptos.view({ payload });
        const posts = result[0] as any[];

        console.log("Raw posts from chain:", posts);

        return posts
            .map((post: any) => ({
                id: Number(post.id),
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            }))
            .filter((post: OnChainPost) => !post.is_deleted)
            .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Error fetching all posts:", error);
        return [];
    }
}

/**
 * Get posts by a specific user
 * @deprecated Use getUserPostsPaginated instead for scalability
 */
export async function getUserPosts(userAddress: string): Promise<OnChainPost[]> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_posts` as `${string}::${string}::${string}`,
            functionArguments: [userAddress],
        };

        const result = await aptos.view({ payload });
        const posts = result[0] as any[];

        return posts
            .map((post: any) => ({
                id: Number(post.id),
                creator: post.creator,
                content: getString(post.content),
                image_url: getString(post.image_url),
                style: Number(post.style),
                total_tips: Number(post.total_tips),
                timestamp: Number(post.timestamp),
                is_deleted: post.is_deleted || false,
                updated_at: Number(post.updated_at || post.timestamp),
                last_tip_timestamp: Number(post.last_tip_timestamp || 0),
                parent_id: Number(post.parent_id || 0),
                is_comment: post.is_comment || false,
            }))
            .filter((post: OnChainPost) => !post.is_deleted)
            .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error("Error fetching user posts:", error);
        return [];
    }
}

/**
 * Get user's post count
 */
export async function getUserPostsCount(userAddress: string): Promise<number> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_posts_count` as `${string}::${string}::${string}`,
            functionArguments: [userAddress],
        };

        const result = await aptos.view({ payload });
        return Number(result[0]);
    } catch (error) {
        console.error("Error fetching user posts count:", error);
        return 0;
    }
}

/**
 * Get total global posts count
 */
export async function getGlobalPostsCount(): Promise<number> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_global_posts_count` as `${string}::${string}::${string}`,
            functionArguments: [],
        };

        const result = await aptos.view({ payload });
        return Number(result[0]);
    } catch (error) {
        console.error("Error fetching global posts count:", error);
        return 0;
    }
}

/**
 * Get display name for a user
 */
export async function getDisplayName(userAddress: string): Promise<string> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_profile` as `${string}::${string}::${string}`,
            functionArguments: [userAddress],
        };

        const result = await aptos.view({ payload });
        return getString(result[0]); // Use getString to handle potential object wrapper
    } catch (error) {
        console.error("Error fetching display name:", error);
        return "";
    }
}

/**
 * Get user tip statistics from blockchain
 * Returns: [total_sent, total_received, tips_sent_count]
 */
export async function getUserTipStats(userAddress: string): Promise<{
    totalSent: number;
    totalReceived: number;
    tipsSentCount: number;
}> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_user_tip_stats` as `${string}::${string}::${string}`,
            functionArguments: [userAddress],
        };

        const result = await aptos.view({ payload });
        const stats = result as [string, string, string];

        return {
            totalSent: parseInt(stats[0]),
            totalReceived: parseInt(stats[1]),
            tipsSentCount: parseInt(stats[2]),
        };
    } catch (error) {
        console.error("Error fetching user tip stats:", error);
        return { totalSent: 0, totalReceived: 0, tipsSentCount: 0 };
    }
}

/**
 * Set user display name
 */
export async function setDisplayName(
    displayName: string,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<void> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::update_profile`,
            functionArguments: [displayName],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
        console.error("Error setting display name:", error);
        throw error;
    }
}

/**
 * Set user avatar URL
 */
export async function setAvatar(
    avatarUrl: string,
    signAndSubmitTransaction: (transaction: InputTransactionData) => Promise<any>
): Promise<void> {
    const transaction: InputTransactionData = {
        data: {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::set_avatar`,
            functionArguments: [avatarUrl],
        },
    };

    try {
        const response = await signAndSubmitTransaction(transaction);
        await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error) {
        console.error("Error setting avatar:", error);
        throw error;
    }
}

/**
 * Get user avatar URL
 */
export async function getAvatar(userAddress: string): Promise<string> {
    try {
        const payload = {
            function: `${MODULE_ADDRESS}::${MODULE_NAME}::get_avatar` as `${string}::${string}::${string}`,
            functionArguments: [userAddress],
        };

        const result = await aptos.view({ payload });
        const avatarUrl = getString(result[0]);

        if (avatarUrl) {
            return avatarUrl;
        }
    } catch (error) {
        // Silently fail and return default
        // console.error("Error fetching avatar:", error);
    }

    // Generate a consistent avatar URL based on the user address
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${userAddress}`;
}
