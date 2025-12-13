/**
 * Landing Page - Movement Style
 * 
 * Minimalist design with black background, yellow accents, and clean structure
 */

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
    const { connected } = useWallet();
    const router = useRouter();
    const { t } = useLanguage();

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

            {/* Navigation */}
            <nav className="nav">
                <div className="container-custom py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-yellow rounded-lg flex items-center justify-center">
                                <span className="text-black font-bold text-lg">M</span>
                            </div>
                            <span className="text-text-primary font-semibold text-lg">MoveFeed</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <a href="#features" className="nav-link">{t.features}</a>
                            <a href="#about" className="nav-link">{t.about}</a>
                        </div>
                    </div>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section className="section py-8 md:py-16">
                    <div className="container-custom">
                        <div className="max-w-4xl mx-auto text-center">
                            {/* Badge */}
                            <div className="mb-6 flex justify-center">
                                <div className="badge-yellow">
                                    <span className="inline-block w-1.5 h-1.5 bg-yellow rounded-full"></span>
                                    {t.poweredBy}
                                </div>
                            </div>

                            {/* Main Heading */}
                            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                                {t.landingTitle}
                                <br />
                                <span className="gradient-text">{t.landingSubtitle}</span>
                            </h1>

                            {/* Description */}
                            <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto leading-relaxed">
                                {t.landingDesc}
                            </p>

                            {/* CTA Button */}
                            <div className="flex justify-center scale-110 origin-top">
                                <WalletConnectButton />
                            </div>

                            {/* Stats */}
                            <div className="mt-10 grid grid-cols-3 gap-6 max-w-3xl mx-auto">
                                <div>
                                    <div className="text-2xl font-bold text-yellow mb-1">{t.fast}</div>
                                    <div className="text-xs text-text-secondary">{t.instantTips}</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-yellow mb-1">{t.secure}</div>
                                    <div className="text-xs text-text-secondary">{t.onChain}</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-yellow mb-1">{t.simple}</div>
                                    <div className="text-xs text-text-secondary">{t.easyToUse}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="divider container-custom"></div>

                {/* Features Section */}
                <section id="features" className="section py-8">
                    <div className="container-custom">
                        <div className="max-w-5xl mx-auto">
                            <h2 className="section-header text-center mb-6">{t.featuresTitle}</h2>
                            <p className="section-description text-center mx-auto max-w-2xl mb-8">
                                {t.featuresDesc}
                            </p>

                            <div className="grid md:grid-cols-3 gap-6">
                                {/* Feature 1 */}
                                <div className="card-hover p-4">
                                    <div className="w-10 h-10 bg-yellow/10 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">{t.sharePosts}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">
                                        {t.sharePostsDesc}
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="card-hover p-4">
                                    <div className="w-10 h-10 bg-yellow/10 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">{t.onChainTips}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">
                                        {t.onChainTipsDesc}
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="card-hover p-4">
                                    <div className="w-10 h-10 bg-yellow/10 rounded-lg flex items-center justify-center mb-3">
                                        <svg className="w-5 h-5 text-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-1">{t.movementNetwork}</h3>
                                    <p className="text-text-secondary text-sm leading-relaxed">
                                        {t.movementNetworkDesc}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="divider container-custom"></div>

                {/* About Section */}
                <section id="about" className="section py-8">
                    <div className="container-custom">
                        <div className="max-w-4xl mx-auto">
                            <h2 className="section-header text-center mb-6">{t.aboutTitle}</h2>
                            <div className="card">
                                <p className="text-text-secondary leading-relaxed mb-3 text-sm">
                                    {t.aboutDesc1}
                                </p>
                                <p className="text-text-secondary leading-relaxed text-sm">
                                    {t.aboutDesc2}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-border py-12">
                    <div className="container-custom">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-yellow rounded flex items-center justify-center">
                                    <span className="text-black font-bold text-sm">M</span>
                                </div>
                                <span className="text-text-secondary text-sm">MoveFeed + Tips</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <a href="https://docs.movementnetwork.xyz" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-yellow text-sm transition-colors">
                                    {t.movementDocs}
                                </a>
                                <a href="https://explorer.movementnetwork.xyz" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-yellow text-sm transition-colors">
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
