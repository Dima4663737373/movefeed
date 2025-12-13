import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <meta name="description" content="MoveFeed + Tips - Post your thoughts. Get on-chain tips." />
                <link rel="icon" href="/favicon.ico" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                // Suppress Nightly Wallet extension errors (aggressive)
                                try {
                                    const originalDefineProperty = Object.defineProperty;
                                    Object.defineProperty = function(obj, prop, descriptor) {
                                        if (prop === 'ethereum' && obj === window) {
                                            try {
                                                return originalDefineProperty(obj, prop, descriptor);
                                            } catch (e) {
                                                console.warn('Suppressed Nightly Wallet extension error (defineProperty)');
                                                return obj;
                                            }
                                        }
                                        return originalDefineProperty(obj, prop, descriptor);
                                    };

                                    window.addEventListener('error', function(e) {
                                        if (
                                            (e.filename && e.filename.includes('fiikommddbeccaoicoejoniammnalkfa')) ||
                                            (e.message && (
                                                e.message.includes('Invalid property descriptor') ||
                                                e.message.includes('Cannot redefine property: ethereum')
                                            ))
                                        ) {
                                            e.stopImmediatePropagation();
                                            e.preventDefault();
                                            console.warn('Suppressed Nightly Wallet extension error (window.onerror)');
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
