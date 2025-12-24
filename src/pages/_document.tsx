import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta name="description" content="MoveX + Tips - Post your thoughts. Get on-chain tips." />
                <link rel="icon" href="/favicon.ico" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                // Suppress Nightly/Razor Wallet extension errors (aggressive)
                                try {
                                    const originalDefineProperty = Object.defineProperty;
                                    Object.defineProperty = function(obj, prop, descriptor) {
                                        if (prop === 'ethereum' && obj === window) {
                                            // Check if property is already defined and non-configurable
                                            const existingDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
                                            if (existingDescriptor && !existingDescriptor.configurable) {
                                                // console.warn('Suppressed error: ethereum property is non-configurable');
                                                return obj;
                                            }
                                            try {
                                                return originalDefineProperty(obj, prop, descriptor);
                                            } catch (e) {
                                                // console.warn('Suppressed Nightly/Razor Wallet extension error (defineProperty)');
                                                return obj;
                                            }
                                        }
                                        return originalDefineProperty(obj, prop, descriptor);
                                    };

                                    window.addEventListener('error', function(e) {
                                        if (
                                            (e.filename && (
                                                e.filename.includes('fiikommddbeccaoicoejoniammnalkfa') || // Nightly
                                                e.filename.includes('evmAsk.js') || // Razor/Others
                                                e.filename.includes('contentScript')
                                            )) ||
                                            (e.message && (
                                                e.message.includes('Invalid property descriptor') ||
                                                e.message.includes('Cannot redefine property: ethereum') ||
                                                e.message.includes('Razor Wallet')
                                            ))
                                        ) {
                                            e.stopImmediatePropagation();
                                            e.preventDefault();
                                            // console.warn('Suppressed Wallet extension error (window.onerror)');
                                        }
                                    }, true);
                                } catch (e) {
                                    console.error('Failed to install error suppressor', e);
                                }
                            })();
                        `,
                    }}
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
