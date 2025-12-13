export interface TextSegment {
    type: 'text' | 'url' | 'hashtag';
    content: string;
}

/**
 * Parses text into segments of text, URLs, and hashtags.
 * @param text The input text to parse
 * @returns An array of TextSegment objects
 */
export function parseText(text: string): TextSegment[] {
    if (!text) return [];
    
    // Regex matches:
    // 1. URLs (http:// or https:// or www.)
    // 2. Hashtags (#word) - Updated to support Unicode (Cyrillic etc)
    const regex = /((?:https?:\/\/|www\.)[^\s]+)|(#[^\s!@#$%^&*()=+[\]{};:'",.<>/?`~]+)/g;
    
    const segments: TextSegment[] = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        
        const matchedString = match[0];
        
        if (match[1]) { // URL group
            segments.push({
                type: 'url',
                content: matchedString
            });
        } else if (match[2]) { // Hashtag group
            // Remove the # prefix for the content, as the UI adds it back
            segments.push({
                type: 'hashtag',
                content: matchedString.substring(1)
            });
        }
        
        lastIndex = regex.lastIndex;
    }
    
    // Remaining text
    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }
    
    return segments;
}

/**
 * Extracts all hashtags from a given text.
 * @param text The text to scan
 * @returns Array of unique hashtags (without #)
 */
export function extractHashtags(text: string): string[] {
    if (!text) return [];
    // Updated regex to support Unicode characters
    const regex = /#[^\s!@#$%^&*()=+[\]{};:'",.<>/?`~]+/g;
    const matches = text.match(regex);
    if (!matches) return [];
    
    // Extract tag and remove #, then deduplicate
    const tags = matches.map(tag => tag.slice(1));
    return Array.from(new Set(tags));
}
