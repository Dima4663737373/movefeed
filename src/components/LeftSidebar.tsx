import Link from 'next/link';
import { useRouter } from 'next/router';
import { useLanguage } from '@/contexts/LanguageContext';

interface LeftSidebarProps {
    activePage: 'home' | 'explore' | 'chat' | 'bookmarks' | 'profile' | 'settings';
    currentUserAddress: string;
    displayName?: string;
    avatar?: string;
}

export default function LeftSidebar({ activePage, currentUserAddress, displayName, avatar }: LeftSidebarProps) {
    const router = useRouter();
    const { t } = useLanguage();

    const navItems = [
        {
            id: 'home',
            label: t.feed,
            href: '/feed',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            id: 'explore',
            label: t.explore,
            href: '/explore',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
            )
        },
        {
            id: 'chat',
            label: t.chat,
            href: '/chat',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            )
        },
        {
            id: 'bookmarks',
            label: t.bookmarks,
            href: '/bookmarks',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            )
        },
        {
            id: 'settings',
            label: t.settings,
            href: '/settings',
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        }
    ];

    const handlePostClick = () => {
        router.push('/feed');
    };

    return (
        <aside className="flex flex-col gap-1 pr-4">
            {navItems.map((item) => {
                const isActive = activePage === item.id;
                return (
                    <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center gap-4 px-4 py-3 rounded-full text-xl transition-colors duration-200 ${isActive
                            ? 'font-bold text-[var(--text-primary)] bg-[var(--card-border)]'
                            : 'font-medium text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'
                            }`}
                    >
                        <div className={`${isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'} transition-colors`}>
                            {item.icon}
                        </div>
                        <span>{item.label}</span>
                    </Link>
                );
            })}

            {/* Profile Button with Avatar */}
            <Link
                href={`/u/${currentUserAddress}`}
                className={`flex items-center gap-4 px-4 py-3 rounded-full transition-colors duration-200 mt-4 ${activePage === 'profile'
                    ? 'font-bold bg-[var(--card-border)]'
                    : 'hover:bg-[var(--hover-bg)]'
                    }`}
            >
                <div className="w-10 h-10 rounded-full bg-[var(--card-border)] flex items-center justify-center text-sm font-bold text-[var(--text-primary)] overflow-hidden">
                    {avatar ? (
                        <img src={avatar} alt={displayName || "User"} className="w-full h-full object-cover" />
                    ) : (
                        <span>{displayName ? displayName[0].toUpperCase() : "U"}</span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-base font-bold text-[var(--text-primary)]">{displayName || "Profile"}</span>
                    <span className="text-sm text-[var(--text-secondary)]">@{currentUserAddress ? currentUserAddress.slice(0, 6) : '...'}...</span>
                </div>
            </Link>
        </aside>
    );
}
