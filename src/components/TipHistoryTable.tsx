/**
 * Tip History Table Component
 * 
 * Displays recent tips received by a creator
 */

'use client';

import { useEffect, useState } from 'react';
import { TipEvent } from '@/types/tip';
import { fetchTipHistory } from '@/lib/movementTx';
import { formatMovementAddress } from '@/lib/movement';
import { getExplorerLink, ExplorerType } from '@/lib/explorer';

interface TipHistoryTableProps {
    creatorAddress: string;
}

export function TipHistoryTable({ creatorAddress }: TipHistoryTableProps) {
    const [history, setHistory] = useState<TipEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [explorerType, setExplorerType] = useState<ExplorerType>('movement');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('preferred_explorer') as ExplorerType;
            if (stored) setExplorerType(stored);
        }
    }, []);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const data = await fetchTipHistory(creatorAddress);
                setHistory(data);
            } catch (error) {
                console.error('Failed to load tip history:', error);
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [creatorAddress]);

    if (loading) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="text-white/50">Loading tip history...</div>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                <div className="text-white/50">No tips received yet</div>
            </div>
        );
    }

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-white/10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                From
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Post
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                                Tx Hash
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {history.map((tip, index) => (
                            <tr key={index} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-mono text-white">
                                        {formatMovementAddress(tip.sender)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-bold text-yellow-400">
                                        {tip.amount.toFixed(2)} MOVE
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-white/70">
                                        {tip.postId ? `Post #${tip.postId}` : '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-white/50">
                                        {formatTimestamp(tip.timestamp)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <a
                                        href={getExplorerLink(tip.txHash, 'tx', explorerType)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-mono text-yellow-400 hover:text-yellow-300 transition-colors"
                                    >
                                        {formatMovementAddress(tip.txHash)}
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
