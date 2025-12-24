import React, { useEffect, useState } from 'react';

interface TipFeedbackProps {
    isActive: boolean;
    onComplete: () => void;
    type?: 'coin' | 'cup' | 'heart';
    amount?: number;
}

export default function TipFeedback({ isActive, onComplete, type = 'coin', amount }: TipFeedbackProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isActive) {
            setShow(true);
            
            // Play Sound
            try {
                // Use synthetic sound to avoid missing file issues
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContext) {
                    const ctx = new AudioContext();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    // "Coin" sound effect (rapid high pitch ramp)
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
                    
                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
                    
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.2);
                }
            } catch (e) {
                console.error("Sound error", e);
            }

            // Hide after animation (Faster now: 0.5s)
            const timer = setTimeout(() => {
                setShow(false);
                onComplete();
            }, 500); // 0.5s duration

            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="relative">
                {/* Animation Container */}
                <div className={`
                    text-6xl font-bold
                    animate-bounce-up-fade
                    filter drop-shadow-lg
                `}>
                    {type === 'coin' && '🪙'}
                    {type === 'cup' && '☕'}
                    {type === 'heart' && '💖'}
                </div>
                
                {amount && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-2xl font-bold text-yellow-400 animate-fade-in-up">
                        +{amount} MOVE
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes bounce-up-fade {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    50% { transform: translateY(-50px) scale(1.2); opacity: 1; }
                    100% { transform: translateY(-100px) scale(1); opacity: 0; }
                }
                @keyframes fade-in-up {
                    0% { transform: translate(-50%, 0); opacity: 0; }
                    100% { transform: translate(-50%, -20px); opacity: 1; }
                }
                .animate-bounce-up-fade {
                    animation: bounce-up-fade 0.5s ease-out forwards;
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards 0.1s;
                }
            `}</style>
        </div>
    );
}
