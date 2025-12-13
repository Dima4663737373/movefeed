import { Ed25519PublicKey, Ed25519Signature, Hex } from "@aptos-labs/ts-sdk";

/**
 * Verifies a signature from an Aptos wallet.
 */
export const formatPublicKey = (publicKey: any): string => {
    let pubKeyStr = publicKey;
    if (typeof publicKey !== 'string') {
            if (Array.isArray(publicKey)) {
                pubKeyStr = publicKey[0];
            } else if (typeof publicKey === 'object' && publicKey !== null) {
                // Try toString first
                if ('toString' in publicKey) {
                    pubKeyStr = publicKey.toString();
                } else {
                    pubKeyStr = String(publicKey);
                }
            } else {
                pubKeyStr = String(publicKey);
            }
    }
    
    // Ensure it's a string and has 0x prefix if hex
    if (typeof pubKeyStr === 'string' && !pubKeyStr.startsWith('0x')) {
        // Try to fix if it's just missing 0x
        if (/^[0-9a-fA-F]+$/.test(pubKeyStr)) {
            pubKeyStr = `0x${pubKeyStr}`;
        }
    }
    return pubKeyStr;
};

export const verifySignature = (
    message: string,
    signature: any,
    publicKey: any
): { valid: boolean; error?: string } => {
    try {
        if (!message) return { valid: false, error: "Message is empty" };
        if (!signature) return { valid: false, error: "Signature is empty" };
        if (!publicKey) return { valid: false, error: "Public key is empty" };

        // Handle potentially array signature
        const sigHex = Array.isArray(signature) ? signature[0] : signature;

        // Ensure we have a string for the signature if it's not already
        if (typeof sigHex !== 'string' && !(sigHex instanceof Uint8Array)) {
             return { valid: false, error: `Invalid signature format: ${typeof sigHex}` };
        }

        const pubKeyStr = formatPublicKey(publicKey);

        let pubKey: Ed25519PublicKey;
        try {
            pubKey = new Ed25519PublicKey(pubKeyStr);
        } catch (e: any) {
            return { valid: false, error: `Invalid Public Key format: ${e.message}` };
        }

        let sig: Ed25519Signature;
        try {
            sig = new Ed25519Signature(sigHex);
        } catch (e: any) {
            return { valid: false, error: `Invalid Signature format: ${e.message}` };
        }
        
        const isValid = pubKey.verifySignature({
            message: new TextEncoder().encode(message),
            signature: sig,
        });

        return { valid: isValid, error: isValid ? undefined : "Signature verification returned false" };
    } catch (e: any) {
        console.error("Signature verification failed:", e);
        console.error("Failed input:", { 
            message, 
            signatureType: typeof signature,
            signatureValue: typeof signature === 'string' ? signature.substring(0, 10) + '...' : 'non-string',
            publicKey 
        });
        return { valid: false, error: e.message || "Unknown verification error" };
    }
};
