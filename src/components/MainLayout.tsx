import { useRouter } from 'next/router';
import LeftSidebar from './LeftSidebar';
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { getDisplayName, getAvatar } from '@/lib/microThreadsClient';

interface MainLayoutProps {
    children: React.ReactNode;
    activePage?: 'home' | 'explore' | 'chat' | 'saved' | 'bookmarks' | 'profile' | 'settings' | 'apps' | 'movement-ai' | 'launchpad';
}

import MobileNav from './MobileNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { account, connected } = useWallet();
    const currentUserAddress = account?.address.toString() || "";
    
    // Determine active page
    const path = router.pathname;
    let activePage: MainLayoutProps['activePage'] = 'home';
    if (path.includes('/explore')) activePage = 'explore';
    else if (path.includes('/chat')) activePage = 'chat';
    else if (path.includes('/saved')) activePage = 'saved';
    else if (path.includes('/bookmarks')) activePage = 'bookmarks';
    else if (path.includes('/settings')) activePage = 'settings';
    else if (path.includes('/apps')) activePage = 'apps';
    else if (path.includes('/movement-ai')) activePage = 'movement-ai';
    
    // Profile State for Sidebar
    const [displayName, setDisplayName] = useState("");
    const [avatar, setAvatar] = useState("");

    const isChatPage = router.pathname === '/chat';
    // Use a slightly wider collapsed state if needed, or 80px. 
    // Standard sidebar is ~240px.
    const sidebarWidthClass = isChatPage ? 'lg:w-[80px]' : 'lg:w-[240px]';

    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUserAddress) {
                try {
                    const name = await getDisplayName(currentUserAddress);
                    const ava = await getAvatar(currentUserAddress);
                    setDisplayName(name);
                    setAvatar(ava);
                } catch (e) {
                    console.error("Error fetching profile for layout", e);
                }
            }
        };
        fetchProfile();
    }, [currentUserAddress]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
             {/* Header - Movement Labs Style */}
             <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)] sticky top-0 z-40 transition-colors duration-300">
                <div className="container-custom py-6">
                    <div className="max-w-[1280px] mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/feed')}>
                            <div className="w-10 h-10 bg-[var(--accent)] rounded-lg flex items-center justify-center shadow-lg">
                                <span className="text-black font-bold text-xl">M</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">MOVEX</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <WalletConnectButton />
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </header>

             <main className="container-custom pb-6 md:pb-10">
                <div className="max-w-[1280px] mx-auto flex items-start gap-0 lg:gap-6">
                    {/* Sidebar Container - Persistent & Animated */}
                    <div className={`hidden lg:block pt-6 sticky top-[100px] h-[calc(100vh-100px)] shrink-0 transition-all duration-300 ease-in-out border-r border-[var(--card-border)] ${sidebarWidthClass}`}>
                        <LeftSidebar 
                            activePage={activePage} 
                            currentUserAddress={currentUserAddress} 
                            displayName={displayName} 
                            avatar={avatar}
                            isCollapsed={isChatPage}
                        />
                    </div>

                    {/* Content Container */}
                    <div className="flex-1 min-w-0 pt-6">
                        {children}
                    </div>
                </div>
             </main>

             {/* Mobile Navigation */}
             <div className="lg:hidden">
                <MobileNav activePage={activePage} currentUserAddress={currentUserAddress} avatar={avatar} />
             </div>
        </div>
    );
}
