/**
 * Type definitions for tipping
 */

export interface TipEvent {
    sender: string;
    receiver: string;
    postId?: string;
    amount: number;
    timestamp: number;
    txHash: string;
}

export interface TipPayloadParams {
    creatorAddress: string;
    postId: string | number;
    amount: number; // in MOVE tokens (human-readable)
}
