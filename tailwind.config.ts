import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Movement-inspired color palette
                background: {
                    DEFAULT: '#000000',
                    secondary: '#0a0a0a',
                    tertiary: '#141414',
                },
                yellow: {
                    DEFAULT: '#FBBF24',
                    50: '#FEF9E7',
                    100: '#FEF3C7',
                    200: '#FDE68A',
                    300: '#FCD34D',
                    400: '#FBBF24',
                    500: '#F59E0B',
                    600: '#D97706',
                    700: '#B45309',
                    800: '#92400E',
                    900: '#78350F',
                },
                text: {
                    primary: '#FFFFFF',
                    secondary: '#A3A3A3',
                    tertiary: '#737373',
                },
                border: {
                    DEFAULT: '#262626',
                    light: '#404040',
                },
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                    '100%': { backgroundPosition: '0% 50%' },
                },
                flow: {
                    '0%': { backgroundPosition: '0% 0%' },
                    '100%': { backgroundPosition: '0% 100%' },
                }
            },
            animation: {
                shimmer: 'shimmer 2s linear infinite',
                flow: 'flow 1.5s linear infinite',
            },
        },
    },
    plugins: [],
};

export default config;
