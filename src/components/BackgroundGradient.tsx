export function BackgroundGradient() {
    return (
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
            {/* Top Left Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[120px]" />
            
            {/* Bottom Right Glow */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-[0.02] blur-[120px]" />
            
            {/* Center Subtle Glow */}
            <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full bg-[var(--accent)] opacity-[0.015] blur-[150px]" />
        </div>
    );
}
