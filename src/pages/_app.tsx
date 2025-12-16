/**
 * App Component
 * 
 * This is the root component that wraps all pages.
 * It initializes:
 * - Wallet adapter provider for on-chain transactions (Petra, Razor, etc.)
 */

import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { WalletProvider } from "@/components/WalletProvider";
import { useEffect } from "react";

import { NotificationsProvider, NotificationButton } from "@/components/Notifications";
import { ThemeProvider } from "@/components/ThemeSwitcher";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { useTipMonitor } from "@/hooks/useTipMonitor";
import { BackgroundGradient } from "@/components/BackgroundGradient";

function TipMonitor() {
    useTipMonitor();

    useEffect(() => {
        console.log("🔔 TipMonitor mounted");
    }, []);

    return null;
}

export default function App({ Component, pageProps }: AppProps) {
    const router = useRouter();
    const isLandingPage = router.pathname === "/";

    useEffect(() => {
        // Suppress Nightly Wallet extension errors causing Next.js overlay crash
        const handleError = (event: ErrorEvent) => {
            if (
                event.filename?.includes('fiikommddbeccaoicoejoniammnalkfa') ||
                event.message?.includes('Invalid property descriptor') ||
                event.message?.includes('Cannot redefine property: ethereum')
            ) {
                // Prevent the error from bubbling up to Next.js error overlay
                event.preventDefault();
                event.stopImmediatePropagation();
                console.warn("Suppressed Nightly Wallet extension error");
            }
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    return (
        <NetworkProvider>
            <LanguageProvider>
                <ThemeProvider>
                    <WalletProvider>
                        <NotificationsProvider>
                            <TipMonitor />
                            <BackgroundGradient />
                            <Component {...pageProps} />
                            {/* Fixed notification button - hidden on landing page */}
                            {!isLandingPage && (
                                <div className="fixed top-7 right-4 z-[9999]">
                                    <NotificationButton />
                                </div>
                            )}
                        </NotificationsProvider>
                    </WalletProvider>
                </ThemeProvider>
            </LanguageProvider>
        </NetworkProvider>
    );
}
