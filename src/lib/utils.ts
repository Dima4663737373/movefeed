/**
 * Format a timestamp into a relative time string (e.g., "5m", "2h", "3d")
 * @param timestamp Timestamp in milliseconds
 * @returns Relative time string
 */
export function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    // Future dates (shouldn't happen usually, but handle gracefully)
    if (diff < 0) return "Just now";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return "Just now";
    } else if (minutes < 60) {
        return `${minutes}m`;
    } else if (hours < 24) {
        return `${hours}h`;
    } else if (days < 7) {
        return `${days}d`;
    } else {
        // Fallback to date for older posts, but keep it compact
        return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
}

/**
 * Format post time based on specific user requirements:
 * - < 24h: "X hours ago" (Relative)
 * - > 24h, This Year: "Day Month"
 * - > 24h, Other Year: "Day Month Year"
 * - Detailed View < 24h: "HH:MM" (Exact time)
 */
export function formatPostTime(timestamp: number, isDetailed: boolean = false): string {
    const now = Date.now();
    const date = new Date(timestamp);
    const diff = now - timestamp;
    const OneDay = 24 * 60 * 60 * 1000;

    // Handle future dates or very slight clock skew
    if (diff < 0) return "Just now";

    // Within 24 hours
    if (diff < OneDay) {
        if (isDetailed) {
            // Exact time for detailed view (e.g., "14:30")
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Relative time for feed
            const minutes = Math.floor(diff / (60 * 1000));
            if (minutes < 1) return "Just now";
            if (minutes < 60) return `${minutes} minutes ago`;
            
            const hours = Math.floor(minutes / 60);
            if (hours === 1) return "1 hour ago";
            return `${hours} hours ago`;
        }
    }

    // Older than 24 hours
    const currentYear = new Date().getFullYear();
    const postYear = date.getFullYear();

    if (postYear === currentYear) {
        // "14 Dec"
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } else {
        // "14 Dec 2024"
        return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

/**
 * Format date for post stats footer
 * Format: "11:14 PM · Dec 1, 2025"
 */
export function formatPostStatsDate(timestamp: number): string {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    
    return `${timeStr} · ${dateStr}`;
}
