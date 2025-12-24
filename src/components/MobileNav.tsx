import Link from 'next/link';
import { useState } from 'react';
import ComposeModal from './ComposeModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSocialActivity } from '@/contexts/SocialActivityContext';
import { useChat } from '@/contexts/ChatContext';

interface MobileNavProps {
    activePage: 'home' | 'explore' | 'chat' | 'saved' | 'profile' | 'settings' | 'apps' | 'movement-ai' | 'bookmarks' | 'launchpad' | 'notifications';
    currentUserAddress: string;
    avatar?: string;
}

export default function MobileNav({ activePage, currentUserAddress, avatar }: MobileNavProps) {
    const { t } = useLanguage();
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const { unreadCount: notificationCount } = useSocialActivity();
    const { totalUnreadCount: chatCount } = useChat();

    const navItems = [
        {
            id: 'home',
            label: 'Home',
            href: '/feed',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            id: 'explore',
            label: 'Explore',
            href: '/explore',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
            )
        },
        {
            id: 'apps',
            label: 'Apps',
            href: '/apps',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            id: 'chat',
            label: 'Chat',
            href: '/chat',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            ),
            badge: chatCount
        },
        {
            id: 'notifications',
            label: 'Notifications',
            href: '/notifications',
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
            ),
            badge: notificationCount
        },
        {
            id: 'profile',
            label: 'Profile',
            href: `/${currentUserAddress}`,
            icon: (
                <div className="w-6 h-6 rounded-full bg-[var(--card-border)] overflow-hidden flex items-center justify-center">
                    {avatar ? (
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    )}
                </div>
            )
        }
    ];

    return (
        <>
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--card-bg)] border-t border-[var(--card-border)] pb-safe z-40">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = activePage === item.id;
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                <div className="relative">
                                    {item.icon}
                                    {/* @ts-ignore */}
                                    {item.badge > 0 && (
                                        <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-[var(--card-bg)]">
                                            {/* @ts-ignore */}
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Floating Action Button (FAB) for Post */}
            <button
                onClick={() => setIsComposeOpen(true)}
                className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-[var(--accent)] text-black rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform active:scale-95"
            >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            <ComposeModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
                onPostCreated={() => {
                    window.dispatchEvent(new Event('tip_sent'));
                }}
            />
        </>
    );
}
