import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'graphite' | 'blue' | 'emerald';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');

    useEffect(() => {
        const storedTheme = localStorage.getItem('microthreads_theme') as Theme;
        if (storedTheme) {
            setTheme(storedTheme);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('microthreads_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const themes: { id: Theme; label: string; icon: React.ReactNode; color: string }[] = [
        {
            id: 'dark',
            label: 'Dark',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
            color: 'bg-black'
        },
        {
            id: 'light',
            label: 'Light',
            icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
            color: 'bg-white border border-gray-200'
        },
        {
            id: 'graphite',
            label: 'Graphite',
            icon: <div className="w-4 h-4 rounded-full bg-neutral-600"></div>,
            color: 'bg-neutral-800'
        },
        {
            id: 'blue',
            label: 'Blue UI',
            icon: <div className="w-4 h-4 rounded-full bg-blue-500"></div>,
            color: 'bg-blue-900'
        },
        {
            id: 'emerald',
            label: 'Emerald',
            icon: <div className="w-4 h-4 rounded-full bg-emerald-500"></div>,
            color: 'bg-emerald-900'
        }
    ];

    const currentTheme = themes.find(t => t.id === theme) || themes[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 bg-neutral-900/90 border border-white/10 rounded-full hover:bg-neutral-800 transition-colors shadow-lg backdrop-blur-md flex items-center justify-center text-white"
                title="Change Theme"
            >
                {currentTheme.icon}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-48 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fadeIn backdrop-blur-xl z-50">
                    <div className="p-2 space-y-1">
                        {themes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    setTheme(t.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${theme === t.id ? 'bg-white/10 text-white' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border border-white/10 ${t.color}`}>
                                    {t.id === 'dark' || t.id === 'light' ? null : null}
                                </div>
                                <span className="text-sm font-medium">{t.label}</span>
                                {theme === t.id && (
                                    <svg className="w-4 h-4 ml-auto text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
