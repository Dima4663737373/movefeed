import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { formatRelativeTime } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

import { useLanguage } from '@/contexts/LanguageContext';

export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'info' | 'error';
    timestamp: number;
    read: boolean;
}

interface NotificationsContextType {
    addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
    markAsRead: (notificationId?: string) => Promise<void>;
    unreadCount: number;
    notifications: Notification[];
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
    const { account, signMessage } = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Fetch from server when connected and setup Realtime subscription
    useEffect(() => {
        if (!account?.address) return;

        const fetchNotifications = async () => {
            try {
                const res = await fetch(`/api/notifications?userAddress=${account.address}`);
                if (res.ok) {
                    const serverNotifications = await res.json();
                    if (Array.isArray(serverNotifications) && serverNotifications.length > 0) {
                        setNotifications(prev => {
                            const existingIds = new Set(prev.map(n => n.id));
                            const newNotifications = serverNotifications.filter((n: Notification) => !existingIds.has(n.id));
                            
                            if (newNotifications.length === 0) return prev;

                            // Merge and sort
                            const merged = [...newNotifications, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
                            return merged;
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to fetch notifications", e);
            }
        };

        fetchNotifications();
        
        // Supabase Realtime Subscription
        let subscription: any = null;
        
        if (supabase && account?.address) {
            const channel = supabase
                .channel('public:notifications')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications',
                    filter: `user_address=eq.${account.address.toString().toLowerCase()}` 
                }, (payload) => {
                    const newNotif = payload.new as any;
                    const notification: Notification = {
                        id: newNotif.id,
                        message: newNotif.message,
                        type: newNotif.type || 'info',
                        timestamp: new Date(newNotif.created_at).getTime(),
                        read: false
                    };
                    
                    setNotifications(prev => [notification, ...prev].slice(0, 50));
                })
                .subscribe();
                
            subscription = channel;
        }

        return () => {
            if (subscription) supabase?.removeChannel(subscription);
        };
    }, [account?.address]);

    const addNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
        const newNotification: Notification = {
            id: Math.random().toString(36).substring(2, 9),
            message,
            type,
            timestamp: Date.now(),
            read: false
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Update document title with notification count
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const updateTitle = () => {
            const currentTitle = document.title;
            const cleanTitle = currentTitle.replace(/^\(\d+\+?\) /, '');
            
            if (unreadCount > 0) {
                const countStr = unreadCount > 9 ? '9+' : unreadCount;
                const newTitle = `(${countStr}) ${cleanTitle}`;
                if (currentTitle !== newTitle) {
                    document.title = newTitle;
                }
            } else if (currentTitle !== cleanTitle) {
                document.title = cleanTitle;
            }
        };

        // Initial update
        updateTitle();

        // Observe title changes (e.g. navigation)
        const titleElement = document.querySelector('title');
        let observer: MutationObserver | null = null;

        if (titleElement) {
            observer = new MutationObserver(() => {
                // Avoid infinite loop by checking if update is needed inside updateTitle
                updateTitle();
            });
            observer.observe(titleElement, { childList: true });
        }

        return () => {
            if (observer) observer.disconnect();
        };
    }, [unreadCount]);

    const markAsRead = useCallback(async (notificationId?: string) => {
        if (!account?.address) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => {
            if (notificationId && n.id !== notificationId) return n;
            return { ...n, read: true };
        }));

        try {
            const messagePayload = {
                userAddress: account.address,
                notificationId, // optional
                action: 'mark_read',
                timestamp: Date.now()
            };
            const messageString = JSON.stringify(messagePayload);

            const response = await signMessage({
                message: messageString,
                nonce: Date.now().toString(),
            });

            let signatureToSend: any = response;
            
            // Handle object wrapper
            if (typeof response === 'object' && response !== null) {
                if ('signature' in response) {
                    signatureToSend = (response as any).signature;
                }
                
                // Handle nested data object
                if (typeof signatureToSend === 'object' && signatureToSend && 'data' in (signatureToSend as any)) {
                    signatureToSend = (signatureToSend as any).data;
                }
            }

            // Handle Uint8Array or Array
            if (Array.isArray(signatureToSend) || signatureToSend instanceof Uint8Array || (typeof signatureToSend === 'object' && signatureToSend !== null && Object.values(signatureToSend).every((v: any) => typeof v === 'number'))) {
                 // Convert to hex string
                 const bytes = Array.isArray(signatureToSend) ? signatureToSend : 
                               (signatureToSend instanceof Uint8Array ? signatureToSend : Object.values(signatureToSend));
                 signatureToSend = "0x" + Array.from(bytes as any[]).map((b: any) => b.toString(16).padStart(2, '0')).join('');
            }

            if (!signatureToSend || (typeof signatureToSend === 'string' && !signatureToSend.startsWith('0x'))) {
                if (typeof signatureToSend === 'string' && /^[0-9a-fA-F]+$/.test(signatureToSend)) {
                    signatureToSend = "0x" + signatureToSend;
                } else {
                     console.warn("Invalid signature format generated for notification mark read");
                     // We don't throw here to avoid crashing the UI for a background task, but we return early
                     return;
                }
            }

            await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageString,
                    signature: signatureToSend,
                    publicKey: Array.isArray(account.publicKey) 
                        ? account.publicKey[0].toString() 
                        : (typeof account.publicKey === 'object' ? account.publicKey.toString() : String(account.publicKey))
                })
            });
        } catch (e) {
            console.error("Failed to mark notifications as read", e);
        }
    }, [account, signMessage]);

    return (
        <NotificationsContext.Provider value={{ addNotification, markAsRead, unreadCount, notifications, setNotifications }}>
            {children}
        </NotificationsContext.Provider>
    );
}

// Separate component for the notification button that can be used in navigation
export function NotificationButton() {
    const { notifications, unreadCount, markAsRead, setNotifications } = useNotifications();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAllAsRead = () => {
        markAsRead();
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            markAllAsRead();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button
                onClick={toggleDropdown}
                className="relative p-3 bg-neutral-900/90 border border-white/10 rounded-full hover:bg-neutral-800 transition-colors shadow-lg backdrop-blur-md group flex items-center justify-center"
            >
                <svg className="w-6 h-6 text-white group-hover:text-yellow-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-black animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fadeIn backdrop-blur-xl z-50">
                    <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h3 className="font-bold text-white text-sm">{t.notifications}</h3>
                        <button
                            onClick={() => setNotifications([])}
                            className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                        >
                            {t.clearAll}
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-neutral-500 text-sm">
                                {t.noNotifications}
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors flex gap-3 ${!notification.read ? 'bg-white/5' : ''}`}
                                >
                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                    <div>
                                        <p className="text-sm text-white leading-snug">{notification.message}</p>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            {formatRelativeTime(notification.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
