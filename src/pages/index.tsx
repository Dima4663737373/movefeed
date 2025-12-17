/**
 * Landing Page - Movement Style
 * 
 * Minimalist design with black background, yellow accents, and clean structure
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { getExplorerLink, ExplorerType } from "@/lib/explorer";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
    const { connected } = useWallet();
    const router = useRouter();
    const { t } = useLanguage();
    const [explorerType, setExplorerType] = useState<ExplorerType>('movement');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('preferred_explorer') as ExplorerType;
            if (stored) setExplorerType(stored);
        }
    }, []);

    // Redirect to feed if already connected
    useEffect(() => {
        if (connected) {
            router.push("/feed");
        }
    }, [connected, router]);

    return (
        <>
            <Head>
                <title>MoveFeed + Tips - Movement Network</title>
            </Head>

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.15]"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[128px] opacity-[0.08] animate-blob"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[128px] opacity-[0.08] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[128px] opacity-[0.05] animate-blob animation-delay-4000"></div>
            </div>

            {/* Navigation */}
            <nav className="nav relative z-50 backdrop-blur-md bg-[var(--bg-primary)]/70 border-b border-[var(--card-border)]/50 sticky top-0">
                <div className="container-custom py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center transform transition-transform group-hover:rotate-12">
                                <span className="text-[var(--btn-text-primary)] font-bold text-lg">M</span>
                            </div>
                            <span className="text-text-primary font-semibold text-lg tracking-tight">MoveFeed</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#features" className="nav-link hover:text-[var(--accent)] transition-colors text-sm font-medium">{t.features}</a>
                            <a href="#about" className="nav-link hover:text-[var(--accent)] transition-colors text-sm font-medium">{t.about}</a>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="section py-16 md:py-32 relative">
                    <div className="container-custom">
                        <div className="max-w-5xl mx-auto text-center">
                            {/* Badge */}
                            <div className="mb-8 flex justify-center animate-fade-in">
                                <div className="inline-flex items-center px-4 py-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 backdrop-blur-md shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)] text-[var(--accent)] text-sm font-medium">
                                    <span className="inline-block w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse mr-2"></span>
                                    {t.poweredBy}
                                </div>
                            </div>

                            {/* Main Heading */}
                            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight animate-fade-in-delay-1 tracking-tight">
                                {t.landingTitle}
                                <br />
                                <span className="text-gradient-gold relative inline-block">
                                    {t.landingSubtitle}
                                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-[var(--accent)] opacity-30" viewBox="0 0 100 10" preserveAspectRatio="none">
                                        <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                                    </svg>
                                </span>
                            </h1>

                            {/* Description */}
                            <p className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-delay-2">
                                {t.landingDesc}
                            </p>

                            {/* CTA Button */}
                            <div className="flex justify-center scale-110 origin-top animate-fade-in-delay-3 relative">
                                <div className="absolute inset-0 bg-[var(--accent)] blur-[40px] opacity-20 rounded-full transform scale-150 animate-pulse"></div>
                                <div className="relative hover:scale-105 transition-transform duration-300">
                                    <WalletConnectButton />
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto animate-fade-in-delay-3">
                                <div className="p-6 rounded-2xl bg-[var(--card-border)]/20 border border-[var(--card-border)] backdrop-blur-sm hover:bg-[var(--card-border)]/40 transition-all duration-300 hover:-translate-y-2 group">
                                    <div className="w-12 h-12 bg-[var(--accent-dim)] rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t.fast}</div>
                                    <div className="text-xs text-[var(--accent)] font-bold uppercase tracking-wider">{t.instantTips}</div>
                                </div>
                                <div className="p-6 rounded-2xl bg-[var(--card-border)]/20 border border-[var(--card-border)] backdrop-blur-sm hover:bg-[var(--card-border)]/40 transition-all duration-300 hover:-translate-y-2 group">
                                    <div className="w-12 h-12 bg-[var(--accent-dim)] rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t.secure}</div>
                                    <div className="text-xs text-[var(--accent)] font-bold uppercase tracking-wider">{t.onChain}</div>
                                </div>
                                <div className="p-6 rounded-2xl bg-[var(--card-border)]/20 border border-[var(--card-border)] backdrop-blur-sm hover:bg-[var(--card-border)]/40 transition-all duration-300 hover:-translate-y-2 group">
                                    <div className="w-12 h-12 bg-[var(--accent-dim)] rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t.simple}</div>
                                    <div className="text-xs text-[var(--accent)] font-bold uppercase tracking-wider">{t.easyToUse}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="divider container-custom opacity-50"></div>

                {/* Features Section */}
                <section id="features" className="section py-24 relative overflow-hidden">
                    <div className="container-custom">
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">{t.featuresTitle}</h2>
                                <p className="text-text-secondary max-w-2xl mx-auto text-lg">
                                    {t.featuresDesc}
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                {/* Feature 1 */}
                                <div className="card-hover-effect p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100"></div>
                                    <div className="w-14 h-14 bg-[var(--accent-dim)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{t.sharePosts}</h3>
                                    <p className="text-text-secondary leading-relaxed">
                                        {t.sharePostsDesc}
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="card-hover-effect p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100"></div>
                                    <div className="w-14 h-14 bg-[var(--accent-dim)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{t.onChainTips}</h3>
                                    <p className="text-text-secondary leading-relaxed">
                                        {t.onChainTipsDesc}
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="card-hover-effect p-8 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity group-hover:opacity-100"></div>
                                    <div className="w-14 h-14 bg-[var(--accent-dim)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <svg className="w-7 h-7 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{t.movementNetwork}</h3>
                                    <p className="text-text-secondary leading-relaxed">
                                        {t.movementNetworkDesc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="divider container-custom opacity-50"></div>

                {/* About Section */}
                <section id="about" className="section py-24">
                    <div className="container-custom">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-3xl md:text-5xl font-bold mb-8">{t.aboutTitle}</h2>
                            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50"></div>
                                <p className="text-text-secondary leading-relaxed mb-6 text-lg">
                                    {t.aboutDesc1}
                                </p>
                                <p className="text-text-secondary leading-relaxed text-lg">
                                    {t.aboutDesc2}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-[var(--card-border)] py-12 bg-[var(--bg-primary)]">
                    <div className="container-custom">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                                    <span className="text-[var(--btn-text-primary)] font-bold text-sm">M</span>
                                </div>
                                <span className="text-text-secondary font-medium">MoveFeed + Tips &copy; 2025</span>
                            </div>
                            <div className="flex items-center gap-8">
                                <a href="https://docs.movementnetwork.xyz" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium">
                                    {t.movementDocs}
                                </a>
                                <a href={getExplorerLink("", "tx", explorerType)} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-[var(--accent)] transition-colors font-medium">
                                    {t.explorer}
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </>
    );
}
