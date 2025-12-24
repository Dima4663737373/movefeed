import { useEffect, useState, useCallback } from 'react';

interface MiniAppContext {
    userAddress?: string;
    postId?: string;
    theme?: 'light' | 'dark';
    language?: string;
}

interface UseMiniAppResult {
    isReady: boolean;
    context: MiniAppContext | null;
    requestTransaction: (payload: any) => Promise<string>;
    resize: (height: number) => void;
    error: string | null;
}

export function useMiniApp(): UseMiniAppResult {
    const [isReady, setIsReady] = useState(false);
    const [context, setContext] = useState<MiniAppContext | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Message ID counter for RPC calls
    const [msgId, setMsgId] = useState(0);
    const [pendingRequests, setPendingRequests] = useState<Map<number, { resolve: Function, reject: Function }>>(new Map());

    useEffect(() => {
        // Handle incoming messages
        const handleMessage = (event: MessageEvent) => {
            // In production, you might want to validate event.origin
            const { id, result, error: rpcError, method, params } = event.data;

            // Handle Responses
            if (id !== undefined && pendingRequests.has(id)) {
                const { resolve, reject } = pendingRequests.get(id)!;
                if (rpcError) {
                    reject(new Error(rpcError));
                } else {
                    resolve(result);
                }
                const newPending = new Map(pendingRequests);
                newPending.delete(id);
                setPendingRequests(newPending);
            }
        };

        window.addEventListener('message', handleMessage);

        // Initialize: Get Context
        // We use a simple timeout loop to try connecting until successful or just once
        const init = async () => {
            try {
                const ctx = await sendRequest('getContext', {});
                setContext(ctx);
                setIsReady(true);
            } catch (err) {
                console.error("Failed to connect to parent:", err);
                // Might not be embedded in a compatible host
                setError("Failed to connect to host environment");
            }
        };

        init();

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []); // Run once

    // Helper to send JSON-RPC requests
    const sendRequest = useCallback((method: string, params: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const id = Date.now() + Math.random();
            
            // Store the promise resolvers
            setPendingRequests(prev => {
                const newMap = new Map(prev);
                newMap.set(id, { resolve, reject });
                return newMap;
            });

            // Send message to parent
            if (window.parent) {
                window.parent.postMessage({
                    jsonrpc: '2.0',
                    id,
                    method,
                    params
                }, '*'); // Target origin * for now, could be restricted
            } else {
                reject(new Error("No parent window found"));
            }
        });
    }, []);

    const requestTransaction = useCallback(async (payload: any) => {
        try {
            const result = await sendRequest('requestTransaction', payload);
            return result.hash;
        } catch (err: any) {
            throw err;
        }
    }, [sendRequest]);

    const resize = useCallback((height: number) => {
        sendRequest('resize', { height }).catch(console.error);
    }, [sendRequest]);

    return {
        isReady,
        context,
        requestTransaction,
        resize,
        error
    };
}
