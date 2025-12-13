/**
 * TransactionStatus Component
 * 
 * Displays the status of a blockchain transaction with appropriate
 * visual feedback and explorer link.
 */

"use client";

interface TransactionStatusProps {
    hash: string | null;
    status: 'idle' | 'pending' | 'confirmed' | 'failed';
    error?: string | null;
}

export default function TransactionStatus({ hash, status, error }: TransactionStatusProps) {
    if (status === 'idle') return null;

    const statusConfig = {
        pending: {
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            text: 'text-yellow-400',
            icon: (
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            ),
            message: 'Transaction pending...'
        },
        confirmed: {
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            text: 'text-green-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ),
            message: 'Transaction confirmed!'
        },
        failed: {
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            text: 'text-red-400',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
            message: error || 'Transaction failed'
        }
    };

    const config = statusConfig[status];

    return (
        <div className={`${config.bg} ${config.border} border rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2`}>
            <div className={config.text}>
                {config.icon}
            </div>
            <div className="flex-1 overflow-hidden">
                <p className={`${config.text} text-sm font-medium`}>
                    {config.message}
                </p>
                {hash && status === 'confirmed' && (
                    <a
                        href={`https://explorer.movementnetwork.xyz/txn/${hash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-400 hover:text-white truncate block transition-colors mt-1"
                    >
                        View: {hash.slice(0, 8)}...{hash.slice(-6)}
                    </a>
                )}
            </div>
        </div>
    );
}
