/**
 * TipHistory Component
 * 
 * Displays a list of recent tips fetched from the Move contract.
 * Shows sender, amount, timestamp, and link to explorer.
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatMovementAddress } from "@/lib/movement";
import { useLanguage } from "@/contexts/LanguageContext";
import { getExplorerLink, ExplorerType } from "@/lib/explorer";

interface Tip {
    sender: string;
    receiver?: string;
    amount: number;
    timestamp: number;
    hash?: string;
}

interface TipHistoryProps {
    tips: Tip[];
    loading: boolean;
}

type Tab = 'all' | 'sent' | 'received';

export default function TipHistory({ tips, loading }: TipHistoryProps) {
    const { account } = useWallet();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [currentPage, setCurrentPage] = useState(0);
    const [explorerType, setExplorerType] = useState<ExplorerType>('movement');
    const safeTips = tips || [];

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('preferred_explorer') as ExplorerType;
            if (stored) setExplorerType(stored);
        }
    }, []);

    const TIPS_PER_PAGE = 5;

    // Filter tips based on active tab
    const filteredTips = safeTips.filter(tip => {
        if (activeTab === 'all') return true;

        // Use explicit type if available (new system)
        if ((tip as any).type) {
            return (tip as any).type === activeTab;
        }

        // Fallback for legacy data
        if (!account) return true;
        const myAddress = account.address.toString();

        if (activeTab === 'sent') {
            return tip.sender === myAddress;
        }
        if (activeTab === 'received') {
            return tip.receiver === myAddress || (tip as any).recipient === myAddress;
        }
        return true;
    });

    // Reset to first page when tab changes
    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setCurrentPage(0);
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredTips.length / TIPS_PER_PAGE);
    const hasMultiplePages = filteredTips.length > TIPS_PER_PAGE;

    // Get tips for current page
    const startIndex = currentPage * TIPS_PER_PAGE;
    const endIndex = startIndex + TIPS_PER_PAGE;
    const displayedTips = filteredTips.slice(startIndex, endIndex);

    const canGoPrevious = currentPage > 0;
    const canGoNext = currentPage < totalPages - 1;

    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-6 w-32 bg-neutral-800 rounded mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-neutral-800/50 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold flex items-center gap-2">
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t.activity}
                </h3>

                {/* Tabs */}
                {account && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                console.log('Clear Activity clicked');
                                if (confirm(t.clearActivityConfirm)) {
                                    console.log('Clearing history...');

                                    // 1. Clear sent tips
                                    localStorage.removeItem('sent_tips_history');

                                    // 2. Snapshot received tips
                                    const receivedSnapshot: Record<string, number> = {};
                                    tips.forEach(tip => {
                                        if ((tip as any).type === 'received') {
                                            receivedSnapshot[(tip as any).postId] = tip.amount;
                                        }
                                    });
                                    localStorage.setItem('received_tips_snapshot', JSON.stringify(receivedSnapshot));

                                    // 3. Set clear timestamp
                                    localStorage.setItem('received_tips_cleared_at', Math.floor(Date.now() / 1000).toString());

                                    console.log('Dispatching tip_sent event');
                                    window.dispatchEvent(new Event('tip_sent'));

                                    // Force reload to ensure clean state
                                    window.location.reload();
                                }
                            }}
                            className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
                        >
                            {t.clearActivity}
                        </button>
                        <div className="flex bg-neutral-800/50 rounded-lg p-1">
                            {(['all', 'sent', 'received'] as Tab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => handleTabChange(tab)}
                                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                        ? 'bg-yellow-400 text-black shadow-lg'
                                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {t[tab]}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {filteredTips.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-4 bg-neutral-800 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                    <h3 className="text-lg font-medium text-white mb-1">{t.noTips}</h3>
                    <p className="text-neutral-500 text-sm">
                        {activeTab === 'sent' ? t.startTipping : t.shareProfile}
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto pr-2">
                        <table className="w-full text-left relative">
                            <thead className="bg-zinc-950">
                                <tr className="text-neutral-500 text-base border-b border-neutral-800">
                                    <th className="pb-3 font-medium">
                                        {activeTab === 'sent' ? t.recipient : t.sender}
                                    </th>
                                    <th className="pb-3 font-medium">{t.amount}</th>
                                    <th className="pb-3 font-medium">{t.time}</th>
                                    <th className="pb-3 font-medium text-right">{t.status}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {displayedTips.map((tip, index) => {
                                    const isSent = (tip as any).type === 'sent';
                                    const otherParty = isSent ? tip.receiver : tip.sender;
                                    const label = isSent ? t.sentTo : t.receivedFrom;
                                    const isAddress = otherParty && otherParty !== 'Tips on Post';

                                    return (
                                        <tr key={index} className="group hover:bg-white/5 transition-colors">
                                            <td className="py-4 text-base font-mono text-neutral-300">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-neutral-500 mb-1">{label}</span>
                                                    {isAddress ? (
                                                        <Link
                                                            href={`/u/${otherParty}`}
                                                            className="text-yellow-400 hover:underline hover:text-yellow-300 transition-colors"
                                                        >
                                                            {formatMovementAddress(otherParty || "")}
                                                        </Link>
                                                    ) : (
                                                        <a
                                                            href={getExplorerLink(tip.hash || "", 'tx', explorerType)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-white hover:text-yellow-400 hover:underline transition-colors"
                                                        >
                                                            {otherParty}
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-white font-medium text-lg">{tip.amount}</span>
                                                    <span className="text-sm text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">MOVE</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-base text-neutral-400">
                                                <a
                                                    href={getExplorerLink(tip.hash || "", 'tx', explorerType)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-yellow-400 hover:underline transition-colors"
                                                >
                                                    {new Date(tip.timestamp * 1000).toLocaleTimeString()}
                                                </a>
                                            </td>
                                            <td className="py-4 text-right">
                                                <a
                                                    href={getExplorerLink(tip.hash || "", 'tx', explorerType)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 transition-colors"
                                                >
                                                    Success
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {hasMultiplePages && (
                        <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-4">
                            <div className="text-sm text-neutral-400">
                                Showing {startIndex + 1}-{Math.min(endIndex, filteredTips.length)} of {filteredTips.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                    disabled={!canGoPrevious}
                                    className="p-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-400/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-400 disabled:hover:border-neutral-700 transition-all"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm text-neutral-400 min-w-[80px] text-center">
                                    Page {currentPage + 1} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                    disabled={!canGoNext}
                                    className="p-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:text-yellow-400 hover:border-yellow-400/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-neutral-400 disabled:hover:border-neutral-700 transition-all"
                                    aria-label="Next page"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
