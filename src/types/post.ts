/**
 * Type definitions for posts
 */

export type PostStyle = 'minimal' | 'gradient' | 'bold';

export interface Post {
    id: string;
    creatorAddress: string;
    creatorHandle: string;
    content: string;
    style: PostStyle;
    totalTips: number;
    createdAt: number;
}

export interface CreatePostParams {
    content: string;
    style: PostStyle;
}
