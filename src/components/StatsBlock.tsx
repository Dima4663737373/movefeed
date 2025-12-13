/**
 * StatsBlock Component
 * 
 * Displays key metrics for the TipJar dApp:
 * - Total Tips Sent
 * - Total Volume (MOVE)
 * - Top Tipper (Address)
 */

import { formatMovementAddress } from "@/lib/movement";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatsBlockProps {
    totalTips: number;
    totalVolume: number;
    topTipper?: string;
    loading: boolean;
}

export default function StatsBlock({ totalTips, totalVolume, topTipper, loading }: StatsBlockProps) {
    const { t } = useLanguage();
    const safeTotalTips = totalTips ?? 0;
    const safeTotalVolume = totalVolume ?? 0;

    const stats = [
        {
            label: t.totalTips,
            value: safeTotalTips.toString(),
            color: "text-[var(--text-primary)]",
        },
        {
            label: t.totalVolume,
            value: `${safeTotalVolume.toFixed(2)} MOVE`,
            color: "text-[var(--accent)]",
        },
        {
            label: t.topTipper,
            value: topTipper && topTipper.startsWith('0x') ? formatMovementAddress(topTipper) : (topTipper || "—"),
            color: "text-[var(--text-primary)]",
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-[var(--card-bg)] rounded-xl animate-pulse border border-[var(--card-border)]"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-6">
            {stats.map((stat, index) => (
                <div key={index} className="text-center">
                    <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                        {stat.value}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">
                        {stat.label}
                    </div>
                </div>
            ))}
        </div>
    );
}
