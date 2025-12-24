import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export const PageLoader = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let timer: NodeJS.Timeout;

        const handleStart = (url: string) => {
            // Ignore shallow routing if needed, but for "click feel" usually we want it
            setLoading(true);
            setProgress(10); // Start immediately at 10%
            
            // Artificial progress increment
            timer = setInterval(() => {
                setProgress((old) => {
                    if (old >= 90) return old;
                    // Random increment between 1 and 5
                    const diff = Math.random() * 5;
                    return Math.min(old + diff, 90);
                });
            }, 200);
        };

        const handleComplete = () => {
            clearInterval(timer);
            setProgress(100);
            setTimeout(() => {
                setLoading(false);
                setTimeout(() => setProgress(0), 300);
            }, 400); // Stay at 100% briefly
        };

        router.events.on('routeChangeStart', handleStart);
        router.events.on('routeChangeComplete', handleComplete);
        router.events.on('routeChangeError', handleComplete);

        return () => {
            clearInterval(timer);
            router.events.off('routeChangeStart', handleStart);
            router.events.off('routeChangeComplete', handleComplete);
            router.events.off('routeChangeError', handleComplete);
        };
    }, [router]);

    if (!loading && progress === 0) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-[3px] z-[99999] pointer-events-none">
            <div 
                className="h-full bg-[var(--accent)] transition-all duration-300 ease-out shadow-[0_0_15px_var(--accent)]"
                style={{ 
                    width: `${progress}%`, 
                    opacity: loading || progress === 100 ? 1 : 0 
                }}
            />
        </div>
    );
};
