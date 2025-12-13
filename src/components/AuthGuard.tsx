/**
 * AuthGuard Component
 * 
 * This component protects routes that require a connected wallet.
 * It redirects users without a connected wallet to the landing page.
 */

"use client";

import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { connected } = useWallet();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        // Only redirect if mounted and strictly not connected
        // We add a small delay to avoid redirecting on transient disconnects (e.g. page refresh or wallet re-initialization)
        let timeoutId: NodeJS.Timeout;

        if (mounted && !connected) {
            timeoutId = setTimeout(() => {
                router.push("/");
            }, 1000); // 1 second grace period
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [mounted, connected, router]);

    // Don't render anything until mounted to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    // Show loading or nothing while checking
    if (!connected) {
        return null;
    }

    // Render protected content
    return <>{children}</>;
}
