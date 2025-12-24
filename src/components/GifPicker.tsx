import React, { useState, useEffect } from 'react';

interface Gif {
    id: string;
    images: {
        fixed_height: {
            url: string;
            width: string;
            height: string;
        };
        original: {
            url: string;
        };
    };
    title: string;
}

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'; // Fallback to public beta key if not set
const GIPHY_API_URL = 'https://api.giphy.com/v1/gifs';

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [search, setSearch] = useState('');
    const [gifs, setGifs] = useState<Gif[]>([]);
    const [loading, setLoading] = useState(false);
    const [trending, setTrending] = useState<Gif[]>([]);

    useEffect(() => {
        fetchTrending();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.trim()) {
                searchGifs(search);
            } else {
                setGifs(trending);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, trending]);

    const fetchTrending = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${GIPHY_API_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`);
            
            if (!res.ok) {
                console.error(`GIPHY API Error: ${res.status} ${res.statusText}`);
                // Try to parse error body
                try {
                    const errData = await res.json();
                    console.error('GIPHY Error Details:', errData);
                } catch (e) { /* ignore */ }
                return;
            }

            const data = await res.json();
            if (data.data) {
                setTrending(data.data);
                if (!search) setGifs(data.data);
            }
        } catch (error) {
            console.error('Error fetching trending GIFs:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchGifs = async (query: string) => {
        try {
            setLoading(true);
            const res = await fetch(`${GIPHY_API_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`);
            
            if (!res.ok) {
                console.error(`GIPHY API Error: ${res.status} ${res.statusText}`);
                return;
            }

            const data = await res.json();
            if (data.data) {
                setGifs(data.data);
            }
        } catch (error) {
            console.error('Error searching GIFs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-xl shadow-2xl w-80 max-h-96 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[var(--card-border)] flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search GIPHY"
                        className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-1.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        autoFocus
                    />
                    {loading && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                <div className="grid grid-cols-2 gap-2">
                    {gifs.map((gif) => (
                        <button
                            key={gif.id}
                            onClick={() => onSelect(gif.images.original.url)}
                            className="relative group w-full aspect-video bg-[var(--bg-secondary)] rounded overflow-hidden"
                        >
                            <img
                                src={gif.images.fixed_height.url}
                                alt={gif.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </button>
                    ))}
                </div>
                {gifs.length === 0 && !loading && (
                    <div className="text-center text-[var(--text-secondary)] py-8 text-sm">
                        No GIFs found
                    </div>
                )}
            </div>
            <div className="p-2 bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)] text-center">
                Powered by GIPHY
            </div>
        </div>
    );
}
