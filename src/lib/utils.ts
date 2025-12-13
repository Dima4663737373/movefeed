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
