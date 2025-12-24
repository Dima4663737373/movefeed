'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface MiniAppRendererProps {
    appUrl: string;
    postId: string;
    height?: number;
}

export default function MiniAppRenderer({ appUrl, postId, height = 300 }: MiniAppRendererProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { account, signAndSubmitTransaction } = useWallet();
    const { t } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);

    // Protocol: Handle messages from the Mini App
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            // Security: Ensure message comes from the appUrl
            // For internal pages (starts with /), we check origin against window.location.origin
            const targetOrigin = appUrl.startsWith('/') 
                ? window.location.origin 
                : new URL(appUrl).origin;

            if (event.origin !== targetOrigin) return;

            const { id, method, params } = event.data;
            if (!method) return;

            const sendResponse = (result: any, error?: string) => {
                iframeRef.current?.contentWindow?.postMessage({
                    jsonrpc: '2.0',
                    id,
                    result,
                    error
                }, targetOrigin);
            };

            try {
                switch (method) {
                    case 'getContext':
                        sendResponse({
                            userAddress: account?.address.toString(),
                            postId: postId,
                            theme: 'dark', // Fixed for now
                            language: 'en' // Can be dynamic
                        });
                        break;

                    case 'requestTransaction':
                        if (!account) {
                            sendResponse(null, 'User not connected');
                            return;
                        }
                        // Params should contain the payload for the transaction
                        const txHash = await signAndSubmitTransaction(params);
                        sendResponse({ hash: txHash.hash });
                        break;
                    
                    case 'resize':
                        if (iframeRef.current && params.height) {
                            iframeRef.current.style.height = `${params.height}px`;
                        }
                        break;

                    default:
                        sendResponse(null, 'Method not found');
                }
            } catch (err: any) {
                console.error("MiniApp Error:", err);
                sendResponse(null, err.message || 'Internal error');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [account, appUrl, postId, signAndSubmitTransaction]);

    return (
        <div className="w-full rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/20 mt-3 relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--card-bg)] z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={appUrl}
                className="w-full border-none transition-all duration-300"
                style={{ height: `${height}px` }}
                onLoad={() => setIsLoading(false)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white/70 uppercase font-bold tracking-wider pointer-events-none">
                Mini App
            </div>
        </div>
    );
}
